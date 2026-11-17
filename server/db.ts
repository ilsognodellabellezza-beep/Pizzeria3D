import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  MenuItem,
  Order,
  PublicUser,
  SiteConfig,
  UserRole,
} from '../src/types.ts';

export interface StoredUser extends PublicUser {
  passwordHash: string;
  salt: string;
}

export interface DatabaseSchema {
  siteConfig: SiteConfig;
  categories: string[];
  menuItems: MenuItem[];
  users: StoredUser[];
  orders: Order[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'store.json');
const AUTH_SECRET = process.env.AUTH_SECRET || 'nati-x-la-pizza-catania-secret-2026';

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signToken(payload: { userId: string; role: UserRole; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyToken(token: string): { userId: string; role: UserRole; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;
    const expected = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      userId: string;
      role: UserRole;
      exp: number;
    };
    if (decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function createInitialDatabase(): DatabaseSchema {
  const ownerCreds = hashPassword('prova1234');
  const customerCreds = hashPassword('pizza123');
  const now = new Date().toISOString();

  return {
    siteConfig: {
      name: 'Nati x la Pizza',
      tagline: 'Pizzeria Artigianale, Rosticceria & Smash Burger a Catania',
      heroHeadline: 'Impasto leggero, anima catanese.',
      heroSubheadline:
        'Lievitazione naturale ad alta digeribilità nel cuore di Cibali. Ordina pizze normali o maxi, panfocacce e smash burger con consegna puntuale a casa tua.',
      heroImageUrl: '/src/assets/images/hero_forno_clean_1794848020963.jpg',
      promoBanner:
        'Consegna gratuita a Catania oltre 20,00 € · Pagamento con Carta o Contanti alla consegna',
      promoActive: true,
      accentColor: '#D92B2B',
      storyTitle: 'L’architettura del gusto, strato per strato',
      storyParagraph:
        'Ogni disco nasce da una maturazione lenta di 48 ore che garantisce leggerezza e alveolatura croccante. Scorri la pagina per vedere i singoli strati prendere forma.',
      address: 'Via Sabato Martelli Castaldi, 92/94, 95123 Catania (CT)',
      neighborhood: 'Zona Cibali · Nei pressi di Via Bezzecca',
      phone: '+39 095 356828',
      email: 'info@natixlapizza.it',
      mapsUrl: 'https://maps.app.goo.gl/52YQKhUe1DDRYFkW8',
      deliveryFee: 2.5,
      freeDeliveryThreshold: 20.0,
      estimatedDeliveryMinutes: '30–40 min',
      acceptCardOnline: true,
      acceptCashOnDelivery: true,
      hours: [
        { day: 'Lunedì', hours: '10:30 – 23:30' },
        { day: 'Martedì', hours: '10:30 – 23:30' },
        { day: 'Mercoledì', hours: '17:30 – 23:30' },
        { day: 'Giovedì', hours: '17:30 – 23:30' },
        { day: 'Venerdì', hours: '17:30 – 23:30' },
        { day: 'Sabato', hours: '17:30 – 23:30' },
        { day: 'Domenica', hours: '17:30 – 23:30' },
      ],
      reviews: [
        {
          id: 'rev-1',
          author: 'Marco Rapisarda',
          neighborhood: 'Cibali, Catania',
          rating: 5,
          text: 'Impasto leggerissimo che si digerisce benissimo anche a cena tardi. La Pizza Porcosa con pistacchio e crocchette è diventata il nostro rito del sabato sera.',
          date: 'Ottobre 2026',
        },
        {
          id: 'rev-2',
          author: 'Chiara Distefano',
          neighborhood: 'Borgo / Via Etnea, Catania',
          rating: 5,
          text: 'Consegna sempre puntuale e pizze ancora caldissime. Ottimo poter pagare sia con carta che in contanti direttamente alla porta.',
          date: 'Settembre 2026',
        },
        {
          id: 'rev-3',
          author: 'Salvo Pappalardo',
          neighborhood: 'San Giovanni Galermo, Catania',
          rating: 5,
          text: 'Oltre alle pizze maxi super condite, i menù smash burger con patatine cheddar e bacon sono sorprendenti. Staff sempre cortese.',
          date: 'Agosto 2026',
        },
      ],
    },
    categories: [
      'Pizze Classiche',
      'Pizze Speciali',
      'Calzoni & Panfocacce',
      'Smash Burger & Panini',
      'Fritti & Sfizi',
      'Dolci & Bibite',
    ],
    menuItems: [
      {
        id: 'pizza-margherita',
        name: 'Margherita Classica',
        category: 'Pizze Classiche',
        description:
          'Pomodoro San Marzano DOP, fior di latte fresco, foglie di basilico e filo d’olio extravergine siciliano.',
        priceNormal: 5.5,
        priceMaxi: 9.0,
        imageUrl: '/src/assets/images/pizza_margherita_classica_1794848004272.jpg',
        available: true,
        featured: true,
        ingredients: ['Pomodoro San Marzano', 'Fior di latte', 'Basilico fresco', 'Olio EVO'],
      },
      {
        id: 'pizza-porcosa',
        name: 'La Porcosa',
        category: 'Pizze Speciali',
        description:
          'La specialità della casa: fior di latte, porchetta arrosto, crema e pesto di pistacchio di Bronte, crocchette di patate e granella croccante.',
        priceNormal: 9.5,
        priceMaxi: 16.5,
        imageUrl: '/src/assets/images/pizza_porcosa_pistacchio_1794848003690.jpg',
        available: true,
        featured: true,
        ingredients: ['Fior di latte', 'Porchetta arrosto', 'Crema di pistacchio', 'Crocchette di patate'],
      },
      {
        id: 'pizza-pistacchiosa',
        name: 'Pistacchiosa & Mortadella',
        category: 'Pizze Speciali',
        description:
          'Base crema di pistacchio verde di Bronte, fior di latte, mortadella IGP a fette sottili, stracciatella e granella tostata.',
        priceNormal: 9.0,
        priceMaxi: 16.0,
        imageUrl: '/src/assets/images/pizza_porcosa_pistacchio_1794848003690.jpg',
        available: true,
        featured: true,
        ingredients: ['Crema di pistacchio', 'Fior di latte', 'Mortadella IGP', 'Granella di pistacchio'],
      },
      {
        id: 'pizza-tartufo-zola',
        name: 'Tartufo e Zola',
        category: 'Pizze Speciali',
        description:
          'Fior di latte, crema profumata al tartufo nero, gorgonzola dolce DOP e funghi porcini trifolati.',
        priceNormal: 9.5,
        priceMaxi: 16.5,
        imageUrl: '/src/assets/images/pizza_margherita_classica_1794848004272.jpg',
        available: true,
        featured: false,
        ingredients: ['Fior di latte', 'Crema al tartufo', 'Gorgonzola DOP', 'Funghi'],
      },
      {
        id: 'pizza-diavola',
        name: 'Diavola Etnea',
        category: 'Pizze Classiche',
        description:
          'Pomodoro San Marzano, fior di latte, salame piccante artigianale, olive nere siciliane e origano dell’Etna.',
        priceNormal: 7.0,
        priceMaxi: 12.5,
        imageUrl: '/src/assets/images/pizza_margherita_classica_1794848004272.jpg',
        available: true,
        featured: false,
        ingredients: ['Pomodoro', 'Fior di latte', 'Salame piccante', 'Olive nere'],
      },
      {
        id: 'pizza-capricciosa',
        name: 'Capricciosa Tradizionale',
        category: 'Pizze Classiche',
        description:
          'Pomodoro, fior di latte, prosciutto cotto scelto, funghi champignon freschi, carciofini e olive nere.',
        priceNormal: 8.0,
        priceMaxi: 14.0,
        imageUrl: '/src/assets/images/pizza_margherita_classica_1794848004272.jpg',
        available: true,
        featured: false,
        ingredients: ['Pomodoro', 'Fior di latte', 'Prosciutto cotto', 'Funghi', 'Olive'],
      },
      {
        id: 'calzone-classico',
        name: 'Calzone Classico al Forno',
        category: 'Calzoni & Panfocacce',
        description:
          'Mezzaluna di impasto ad alta digeribilità farcita con pomodoro, fior di latte, prosciutto cotto e pepe nero.',
        priceNormal: 7.0,
        priceMaxi: null,
        imageUrl: '/src/assets/images/hero_forno_clean_1794848020963.jpg',
        available: true,
        featured: false,
        ingredients: ['Impasto 48h', 'Pomodoro', 'Fior di latte', 'Prosciutto cotto'],
      },
      {
        id: 'panfocaccia-casale',
        name: 'Panfocaccia del Casale',
        category: 'Calzoni & Panfocacce',
        description:
          'Base morbida cotta su pietra, condita a crudo con prosciutto crudo di Parma, scaglie di grana, rucola e datterini.',
        priceNormal: 8.5,
        priceMaxi: null,
        imageUrl: '/src/assets/images/pizza_margherita_classica_1794848004272.jpg',
        available: true,
        featured: false,
        ingredients: ['Focaccia calda', 'Prosciutto crudo', 'Rucola', 'Grana'],
      },
      {
        id: 'menu-smash-burger',
        name: 'Menù Double Smash Burger',
        category: 'Smash Burger & Panini',
        description:
          'Doppio hamburger smashed su piastra rovente, doppio cheddar fuso, bacon croccante, salsa della casa, patatine e bibita 33cl.',
        priceNormal: 11.5,
        priceMaxi: null,
        imageUrl: '/src/assets/images/burger_fritti_combo_1794848004411.jpg',
        available: true,
        featured: true,
        ingredients: ['Doppio Smash Manzo', 'Cheddar', 'Bacon', 'Patatine + Bibita'],
      },
      {
        id: 'panino-porchetta-pistacchio',
        name: 'Panino Porchetta & Pistacchio',
        category: 'Smash Burger & Panini',
        description:
          'Pane artigianale caldo ripieno di porchetta arrosto, provola ragusana fusa e crema di pistacchio di Bronte.',
        priceNormal: 8.5,
        priceMaxi: null,
        imageUrl: '/src/assets/images/burger_fritti_combo_1794848004411.jpg',
        available: true,
        featured: false,
        ingredients: ['Porchetta arrosto', 'Provola fusa', 'Crema di pistacchio'],
      },
      {
        id: 'fritti-cheddar-bacon',
        name: 'Patatine Cheddar & Bacon',
        category: 'Fritti & Sfizi',
        description:
          'Porzione generosa di patatine fritte dorate ricoperte di salsa cheddar calda e cubetti di bacon croccante.',
        priceNormal: 5.0,
        priceMaxi: null,
        imageUrl: '/src/assets/images/burger_fritti_combo_1794848004411.jpg',
        available: true,
        featured: false,
        ingredients: ['Patatine stick', 'Salsa cheddar', 'Bacon croccante'],
      },
      {
        id: 'fritti-tris-sfizi',
        name: 'Tris Crocchette, Nuggets & Cipolla',
        category: 'Fritti & Sfizi',
        description:
          'Mix croccante con crocchette di patate artigianali, chicken nuggets dorati e anelli di cipolla pastellati.',
        priceNormal: 5.5,
        priceMaxi: null,
        imageUrl: '/src/assets/images/burger_fritti_combo_1794848004411.jpg',
        available: true,
        featured: false,
        ingredients: ['Crocchette di patate', 'Chicken nuggets', 'Anelli di cipolla'],
      },
      {
        id: 'dolce-filoncino-pistacchio',
        name: 'Filoncino Dolce al Pistacchio',
        category: 'Dolci & Bibite',
        description:
          'Impasto soffice cotto al forno e farcito con generosa crema dolce al pistacchio e granella tostata.',
        priceNormal: 6.5,
        priceMaxi: null,
        imageUrl: '/src/assets/images/pizza_porcosa_pistacchio_1794848003690.jpg',
        available: true,
        featured: false,
        ingredients: ['Impasto dolce', 'Crema al pistacchio', 'Granella'],
      },
      {
        id: 'birre-bibite',
        name: 'Birra Moretti / Ceres / Tennent’s (33cl)',
        category: 'Dolci & Bibite',
        description:
          'Birre ghiacciate in bottiglia da 33cl oppure bibite analcoliche in lattina servite fredde.',
        priceNormal: 3.5,
        priceMaxi: null,
        imageUrl: '/src/assets/images/burger_fritti_combo_1794848004411.jpg',
        available: true,
        featured: false,
        ingredients: ['Birra 33cl', 'Servita fredda'],
      },
    ],
    users: [
      {
        id: 'user-owner',
        username: 'owner',
        email: 'owner@natixlapizza.it',
        fullName: 'Proprietario Nati x la Pizza',
        phone: '+39 095 356828',
        address: 'Via Sabato Martelli Castaldi, 92/94, Catania',
        role: 'owner',
        passwordHash: ownerCreds.hash,
        salt: ownerCreds.salt,
        createdAt: now,
      },
      {
        id: 'user-demo-customer',
        username: 'marco',
        email: 'cliente@catania.it',
        fullName: 'Marco Rapisarda',
        phone: '+39 340 1234567',
        address: 'Via Etnea, 214, Catania',
        role: 'customer',
        passwordHash: customerCreds.hash,
        salt: customerCreds.salt,
        createdAt: now,
      },
    ],
    orders: [
      {
        id: 'NXP-1041',
        userId: 'user-demo-customer',
        customerName: 'Marco Rapisarda',
        customerPhone: '+39 340 1234567',
        customerEmail: 'cliente@catania.it',
        deliveryType: 'domicilio',
        requestedTime: 'Subito (30–40 min)',
        address: 'Via Etnea, 214, Catania',
        floorOrNotes: 'Scala B, 3° piano — Citofono Rapisarda',
        kitchenNotes: 'Tagliare le pizze a spicchi',
        internalNotes: 'Consegnato da Salvo',
        items: [
          {
            cartKey: 'pizza-porcosa-normale',
            menuItemId: 'pizza-porcosa',
            name: 'La Porcosa',
            format: 'normale',
            unitPrice: 9.5,
            quantity: 2,
            imageUrl: '/src/assets/images/pizza_porcosa_pistacchio_1794848003690.jpg',
          },
          {
            cartKey: 'fritti-cheddar-bacon-standard',
            menuItemId: 'fritti-cheddar-bacon',
            name: 'Patatine Cheddar & Bacon',
            format: 'standard',
            unitPrice: 5.0,
            quantity: 1,
            imageUrl: '/src/assets/images/burger_fritti_combo_1794848004411.jpg',
          },
        ],
        subtotal: 24.0,
        deliveryFee: 0,
        total: 24.0,
        paymentMethod: 'carta',
        paymentStatus: 'pagato_carta',
        cardLast4: '4242',
        status: 'consegnato',
        createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      },
      {
        id: 'NXP-1042',
        userId: null,
        customerName: 'Giulia Toscano',
        customerPhone: '+39 347 8899123',
        customerEmail: 'giulia.toscano@email.it',
        deliveryType: 'domicilio',
        requestedTime: '20:30',
        address: 'Via Bezzecca, 18, Catania',
        floorOrNotes: 'Piano terra, porta verde — Citofonare 2 volte',
        kitchenNotes: 'Margherita ben cotta sul bordo',
        internalNotes: 'Rider assegnato: Andrea',
        items: [
          {
            cartKey: 'pizza-margherita-maxi',
            menuItemId: 'pizza-margherita',
            name: 'Margherita Classica',
            format: 'maxi',
            unitPrice: 9.0,
            quantity: 1,
            imageUrl: '/src/assets/images/pizza_margherita_classica_1794848004272.jpg',
            notes: 'Ben cotta',
          },
          {
            cartKey: 'menu-smash-burger-standard',
            menuItemId: 'menu-smash-burger',
            name: 'Menù Double Smash Burger',
            format: 'standard',
            unitPrice: 11.5,
            quantity: 1,
            imageUrl: '/src/assets/images/burger_fritti_combo_1794848004411.jpg',
          },
        ],
        subtotal: 20.5,
        deliveryFee: 0,
        total: 20.5,
        paymentMethod: 'contanti',
        paymentStatus: 'alla_consegna',
        cashChangeFor: '50,00 €',
        cashBillAmount: 50,
        status: 'forno',
        createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
      },
    ],
  };
}

let cachedDb: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    cachedDb = initial;
    return cachedDb;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  cachedDb = JSON.parse(raw) as DatabaseSchema;
  return cachedDb;
}

export function saveDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
  cachedDb = db;
}
