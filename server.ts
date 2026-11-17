import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  getDb,
  hashPassword,
  saveDb,
  signToken,
  toPublicUser,
  verifyPassword,
  verifyToken,
} from './server/db.ts';
import type {
  CartItem,
  DeliveryType,
  MenuItem,
  Order,
  OrderStatus,
  PaymentMethod,
  SiteConfig,
} from './src/types.ts';

interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    role: 'customer' | 'owner';
  };
}

function attachAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    const parsed = verifyToken(token);
    if (parsed) {
      req.auth = { userId: parsed.userId, role: parsed.role };
    }
  }
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: 'Autenticazione richiesta' });
    return;
  }
  next();
}

function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.auth || req.auth.role !== 'owner') {
    res.status(403).json({ error: 'Accesso riservato al proprietario' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '4mb' }));
  app.use(attachAuth);

  // Public bootstrap data
  app.get('/api/bootstrap', (_req, res) => {
    const db = getDb();
    res.json({
      siteConfig: db.siteConfig,
      categories: db.categories,
      menuItems: db.menuItems,
    });
  });

  // Auth: Register customer account
  app.post('/api/auth/register', (req, res) => {
    const { username, email, password, fullName, phone, address } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      fullName?: string;
      phone?: string;
      address?: string;
    };

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanUsername = (username || cleanEmail.split('@')[0] || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanAddress = (address || '').trim();

    if (!cleanEmail || !password || password.length < 4 || !cleanName) {
      res.status(400).json({
        error: 'Inserisci nome completo, email valida e una password di almeno 4 caratteri.',
      });
      return;
    }

    const db = getDb();
    const duplicate = db.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername,
    );
    if (duplicate) {
      res.status(409).json({ error: 'Esiste già un account con questa email o username.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const newUser = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      username: cleanUsername,
      email: cleanEmail,
      fullName: cleanName,
      phone: cleanPhone,
      address: cleanAddress,
      role: 'customer' as const,
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDb(db);

    const token = signToken({
      userId: newUser.id,
      role: newUser.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    res.status(201).json({
      token,
      user: toPublicUser(newUser),
    });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };

    const cleanId = (identifier || '').trim().toLowerCase();
    const rawPass = password || '';

    if (!cleanId || !rawPass) {
      res.status(400).json({ error: 'Inserisci nome utente (o email) e password.' });
      return;
    }

    const db = getDb();
    const user = db.users.find(
      (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId,
    );

    if (!user || !verifyPassword(rawPass, user.passwordHash, user.salt)) {
      res.status(401).json({ error: 'Credenziali non valide. Riprova.' });
      return;
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    res.json({
      token,
      user: toPublicUser(user),
    });
  });

  // Auth: Current user profile
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.auth?.userId);
    if (!user) {
      res.status(404).json({ error: 'Utente non trovato' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  });

  // Auth: Update customer profile
  app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const { fullName, phone, address } = req.body as {
      fullName?: string;
      phone?: string;
      address?: string;
    };
    const db = getDb();
    const user = db.users.find((u) => u.id === req.auth?.userId);
    if (!user) {
      res.status(404).json({ error: 'Utente non trovato' });
      return;
    }
    if (typeof fullName === 'string' && fullName.trim()) user.fullName = fullName.trim();
    if (typeof phone === 'string') user.phone = phone.trim();
    if (typeof address === 'string') user.address = address.trim();
    saveDb(db);
    res.json({ user: toPublicUser(user) });
  });

  // Orders: Place order
  app.post('/api/orders', (req: AuthenticatedRequest, res) => {
    const body = req.body as {
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      deliveryType?: DeliveryType;
      requestedTime?: string;
      address?: string;
      floorOrNotes?: string;
      kitchenNotes?: string;
      items?: CartItem[];
      paymentMethod?: PaymentMethod;
      cardNumber?: string;
      cardExpiry?: string;
      cardCvc?: string;
      cashChangeFor?: string;
      cashBillAmount?: number;
    };

    const customerName = (body.customerName || '').trim();
    const customerPhone = (body.customerPhone || '').trim();
    const customerEmail = (body.customerEmail || '').trim();
    const deliveryType: DeliveryType = body.deliveryType === 'asporto' ? 'asporto' : 'domicilio';
    const requestedTime = (body.requestedTime || 'Subito (30–40 min)').trim();
    const address =
      deliveryType === 'asporto'
        ? 'Ritiro in sede — Via Sabato Martelli Castaldi 92/94'
        : (body.address || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentMethod: PaymentMethod = body.paymentMethod === 'carta' ? 'carta' : 'contanti';

    if (!customerName || !customerPhone) {
      res.status(400).json({ error: 'Nome e numero di telefono sono obbligatori.' });
      return;
    }
    if (deliveryType === 'domicilio' && !address) {
      res.status(400).json({ error: 'Inserisci l’indirizzo di consegna a Catania.' });
      return;
    }
    if (items.length === 0) {
      res.status(400).json({ error: 'Il carrello è vuoto.' });
      return;
    }

    const db = getDb();

    if (paymentMethod === 'carta') {
      if (!db.siteConfig.acceptCardOnline) {
        res.status(400).json({ error: 'Il pagamento con carta è al momento disattivato.' });
        return;
      }
      const digits = (body.cardNumber || '').replace(/\s+/g, '');
      if (digits.length < 12 || !body.cardExpiry || !body.cardCvc || body.cardCvc.length < 3) {
        res.status(400).json({ error: 'Inserisci i dati completi della carta (numero, scadenza, CVC).' });
        return;
      }
    } else if (!db.siteConfig.acceptCashOnDelivery) {
      res.status(400).json({ error: 'Il pagamento in contanti alla consegna è disattivato.' });
      return;
    }

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
      0,
    );
    const roundedSubtotal = Math.round(subtotal * 100) / 100;

    let deliveryFee = 0;
    if (deliveryType === 'domicilio') {
      deliveryFee =
        roundedSubtotal >= db.siteConfig.freeDeliveryThreshold ? 0 : db.siteConfig.deliveryFee;
    }
    const total = Math.round((roundedSubtotal + deliveryFee) * 100) / 100;

    const orderNum = 1043 + db.orders.length;
    const now = new Date().toISOString();
    const cardDigits = (body.cardNumber || '').replace(/\D+/g, '');

    const newOrder: Order = {
      id: `NXP-${orderNum}`,
      userId: req.auth?.userId ?? null,
      customerName,
      customerPhone,
      customerEmail,
      deliveryType,
      requestedTime,
      address,
      floorOrNotes: (body.floorOrNotes || '').trim(),
      kitchenNotes: (body.kitchenNotes || '').trim(),
      internalNotes: '',
      items,
      subtotal: roundedSubtotal,
      deliveryFee,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'carta' ? 'pagato_carta' : 'alla_consegna',
      cardLast4: paymentMethod === 'carta' ? cardDigits.slice(-4) || '4242' : undefined,
      cashChangeFor:
        paymentMethod === 'contanti' && body.cashChangeFor
          ? body.cashChangeFor.trim()
          : undefined,
      cashBillAmount:
        paymentMethod === 'contanti' && typeof body.cashBillAmount === 'number'
          ? body.cashBillAmount
          : undefined,
      status: 'ricevuto',
      createdAt: now,
      updatedAt: now,
    };

    db.orders.unshift(newOrder);
    saveDb(db);

    res.status(201).json({ order: newOrder });
  });

  // Orders: Customer's own order history
  app.get('/api/orders/my', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const myOrders = db.orders.filter((o) => o.userId === req.auth?.userId);
    res.json({ orders: myOrders });
  });

  // Orders: Track single order by ID
  app.get('/api/orders/:id', (req, res) => {
    const db = getDb();
    const order = db.orders.find((o) => o.id.toUpperCase() === req.params.id.toUpperCase());
    if (!order) {
      res.status(404).json({ error: 'Ordine non trovato' });
      return;
    }
    res.json({ order });
  });

  // OWNER ADMIN API: Full Site CMS Update
  app.put('/api/admin/site', requireOwner, (req, res) => {
    const db = getDb();
    const incoming = req.body as Partial<SiteConfig>;
    db.siteConfig = {
      ...db.siteConfig,
      ...incoming,
      deliveryFee:
        incoming.deliveryFee !== undefined
          ? Number(incoming.deliveryFee)
          : db.siteConfig.deliveryFee,
      freeDeliveryThreshold:
        incoming.freeDeliveryThreshold !== undefined
          ? Number(incoming.freeDeliveryThreshold)
          : db.siteConfig.freeDeliveryThreshold,
    };
    saveDb(db);
    res.json({ siteConfig: db.siteConfig });
  });

  // OWNER ADMIN API: Update categories
  app.put('/api/admin/categories', requireOwner, (req, res) => {
    const { categories } = req.body as { categories?: string[] };
    if (!Array.isArray(categories) || categories.length === 0) {
      res.status(400).json({ error: 'Elenco categorie non valido.' });
      return;
    }
    const db = getDb();
    db.categories = categories.map((c) => c.trim()).filter(Boolean);
    saveDb(db);
    res.json({ categories: db.categories });
  });

  // OWNER ADMIN API: Create Menu Item
  app.post('/api/admin/menu', requireOwner, (req, res) => {
    const body = req.body as Partial<MenuItem>;
    if (!body.name || !body.category || body.priceNormal === undefined) {
      res.status(400).json({ error: 'Nome, categoria e prezzo base sono obbligatori.' });
      return;
    }
    const db = getDb();
    const newItem: MenuItem = {
      id: `item-${crypto.randomUUID().slice(0, 8)}`,
      name: body.name.trim(),
      category: body.category.trim(),
      description: (body.description || '').trim(),
      priceNormal: Number(body.priceNormal),
      priceMaxi:
        body.priceMaxi !== null && body.priceMaxi !== undefined && String(body.priceMaxi) !== ''
          ? Number(body.priceMaxi)
          : null,
      imageUrl:
        body.imageUrl || '/src/assets/images/pizza_margherita_classica_1794848004272.jpg',
      available: body.available !== undefined ? Boolean(body.available) : true,
      featured: Boolean(body.featured),
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
    };
    if (!db.categories.includes(newItem.category)) {
      db.categories.push(newItem.category);
    }
    db.menuItems.unshift(newItem);
    saveDb(db);
    res.status(201).json({ item: newItem, menuItems: db.menuItems, categories: db.categories });
  });

  // OWNER ADMIN API: Update Menu Item
  app.put('/api/admin/menu/:id', requireOwner, (req, res) => {
    const db = getDb();
    const index = db.menuItems.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Prodotto non trovato' });
      return;
    }
    const patch = req.body as Partial<MenuItem>;
    const current = db.menuItems[index];
    const updated: MenuItem = {
      ...current,
      ...patch,
      priceNormal:
        patch.priceNormal !== undefined ? Number(patch.priceNormal) : current.priceNormal,
      priceMaxi:
        patch.priceMaxi !== undefined
          ? patch.priceMaxi === null || String(patch.priceMaxi) === ''
            ? null
            : Number(patch.priceMaxi)
          : current.priceMaxi,
    };
    if (!db.categories.includes(updated.category)) {
      db.categories.push(updated.category);
    }
    db.menuItems[index] = updated;
    saveDb(db);
    res.json({ item: updated, menuItems: db.menuItems, categories: db.categories });
  });

  // OWNER ADMIN API: Delete Menu Item
  app.delete('/api/admin/menu/:id', requireOwner, (req, res) => {
    const db = getDb();
    const before = db.menuItems.length;
    db.menuItems = db.menuItems.filter((m) => m.id !== req.params.id);
    if (db.menuItems.length === before) {
      res.status(404).json({ error: 'Prodotto non trovato' });
      return;
    }
    saveDb(db);
    res.json({ menuItems: db.menuItems });
  });

  // OWNER ADMIN API: Overview
  app.get('/api/admin/overview', requireOwner, (_req, res) => {
    const db = getDb();
    res.json({
      orders: db.orders,
      customers: db.users.filter((u) => u.role === 'customer').map(toPublicUser),
    });
  });

  // OWNER ADMIN API: Update order status and internal rider/kitchen notes
  app.patch('/api/admin/orders/:id', requireOwner, (req, res) => {
    const { status, internalNotes } = req.body as {
      status?: OrderStatus;
      internalNotes?: string;
    };
    const validStatuses: OrderStatus[] = [
      'ricevuto',
      'preparazione',
      'forno',
      'consegna',
      'consegnato',
      'annullato',
    ];
    const db = getDb();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Ordine non trovato' });
      return;
    }
    if (status) {
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Stato ordine non valido.' });
        return;
      }
      order.status = status;
    }
    if (typeof internalNotes === 'string') {
      order.internalNotes = internalNotes;
    }
    order.updatedAt = new Date().toISOString();
    saveDb(db);
    res.json({ order });
  });

  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nati x la Pizza server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
