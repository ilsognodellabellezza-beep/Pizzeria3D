import {
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  Edit3,
  Globe,
  LogOut,
  MapPin,
  Package,
  Phone,
  Pizza,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, setStoredToken } from '../api';
import type { MenuItem, Order, OrderStatus, PublicUser, SiteConfig } from '../types';

interface OwnerDashboardProps {
  open: boolean;
  onClose: () => void;
  siteConfig: SiteConfig;
  categories: string[];
  menuItems: MenuItem[];
  onSiteConfigSaved: (config: SiteConfig) => void;
  onMenuUpdated: (items: MenuItem[], categories?: string[]) => void;
  onLogout: () => void;
}

type AdminSection = 'orders' | 'menu' | 'branding' | 'operations' | 'customers';

const IMAGE_GALLERY = [
  {
    label: 'Forno & Pizza Margherita',
    url: '/src/assets/images/hero_forno_clean_1794848020963.jpg',
  },
  {
    label: 'Margherita Classica',
    url: '/src/assets/images/pizza_margherita_classica_1794848004272.jpg',
  },
  {
    label: 'Porcosa & Pistacchio',
    url: '/src/assets/images/pizza_porcosa_pistacchio_1794848003690.jpg',
  },
  {
    label: 'Smash Burger & Fritti',
    url: '/src/assets/images/burger_fritti_combo_1794848004411.jpg',
  },
];

const ORDER_STATUSES: { value: OrderStatus; label: string; nextAction?: string; nextStatus?: OrderStatus }[] = [
  { value: 'ricevuto', label: 'Ricevuto', nextAction: 'Inizia Preparazione', nextStatus: 'preparazione' },
  { value: 'preparazione', label: 'In preparazione', nextAction: 'Metti in Forno', nextStatus: 'forno' },
  { value: 'forno', label: 'In forno', nextAction: 'Affida al Rider', nextStatus: 'consegna' },
  { value: 'consegna', label: 'In consegna', nextAction: 'Segna Consegnato', nextStatus: 'consegnato' },
  { value: 'consegnato', label: 'Consegnato' },
  { value: 'annullato', label: 'Annullato' },
];

export function OwnerDashboard({
  open,
  onClose,
  siteConfig,
  categories,
  menuItems,
  onSiteConfigSaved,
  onMenuUpdated,
  onLogout,
}: OwnerDashboardProps) {
  const [section, setSection] = useState<AdminSection>('orders');

  // Orders & Customers state
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<PublicUser[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Order filters & precision inspection
  const [orderStatusFilter, setOrderStatusFilter] = useState<'attivi' | 'tutti' | OrderStatus>('attivi');
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<'tutti' | 'domicilio' | 'asporto'>('tutti');
  const [orderSearch, setOrderSearch] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  // Menu CRUD state
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string>('Tutte');
  const [menuSearch, setMenuSearch] = useState('');
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [menuSaving, setMenuSaving] = useState(false);

  // CMS state
  const [draftSite, setDraftSite] = useState<SiteConfig>(siteConfig);
  const [siteSaving, setSiteSaving] = useState(false);
  const [siteSavedToast, setSiteSavedToast] = useState(false);

  useEffect(() => {
    setDraftSite(siteConfig);
  }, [siteConfig]);

  const fetchOverview = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.adminOverview();
      setOrders(res.orders);
      setCustomers(res.customers);
      const initialNotes: Record<string, string> = {};
      res.orders.forEach((o) => {
        initialNotes[o.id] = o.internalNotes || '';
      });
      setNoteDrafts(initialNotes);
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOverview();
    }
  }, [open]);

  const activeOrdersCount = useMemo(
    () => orders.filter((o) => o.status !== 'consegnato' && o.status !== 'annullato').length,
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderStatusFilter === 'attivi') {
        if (o.status === 'consegnato' || o.status === 'annullato') return false;
      } else if (orderStatusFilter !== 'tutti' && o.status !== orderStatusFilter) {
        return false;
      }
      if (orderDeliveryFilter !== 'tutti' && o.deliveryType !== orderDeliveryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q)
      );
    });
  }, [orders, orderStatusFilter, orderDeliveryFilter, orderSearch]);

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (menuCategoryFilter !== 'Tutte' && item.category !== menuCategoryFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [menuItems, menuCategoryFilter, menuSearch]);

  if (!open) return null;

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { order } = await api.adminUpdateOrder(orderId, { status });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    } catch {
      // ignore
    }
  };

  const handleSaveInternalNote = async (orderId: string) => {
    setSavingNoteId(orderId);
    try {
      const { order } = await api.adminUpdateOrder(orderId, {
        internalNotes: noteDrafts[orderId] ?? '',
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    } finally {
      setSavingNoteId(null);
    }
  };

  const handlePrintComanda = (order: Order) => {
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) return;
    const rows = order.items
      .map(
        (it) =>
          `<tr><td>${it.quantity}× ${it.name} ${
            it.format !== 'standard' ? `(${it.format})` : ''
          }${it.notes ? `<br/><small>Note: ${it.notes}</small>` : ''}</td><td style="text-align:right">${(
            it.unitPrice * it.quantity
          ).toFixed(2)} €</td></tr>`,
      )
      .join('');
    w.document.write(`
      <html><head><title>Comanda ${order.id}</title>
      <style>body{font-family:monospace;padding:16px;font-size:13px;} h2{margin:0 0 8px;} table{width:100%;border-collapse:collapse;margin:12px 0;} td{padding:4px 0;border-bottom:1px dashed #ccc;} .total{font-size:16px;font-weight:bold;}</style>
      </head><body>
        <h2>${siteConfig.name} — COMANDA ${order.id}</h2>
        <div>Orario richiesto: <strong>${order.requestedTime}</strong></div>
        <div>Tipo: <strong>${order.deliveryType.toUpperCase()}</strong></div>
        <hr/>
        <div><strong>Cliente:</strong> ${order.customerName} (${order.customerPhone})</div>
        <div><strong>Indirizzo:</strong> ${order.address}</div>
        ${order.floorOrNotes ? `<div><strong>Citofono/Piano:</strong> ${order.floorOrNotes}</div>` : ''}
        ${order.kitchenNotes ? `<div><strong>NOTE CUCINA:</strong> ${order.kitchenNotes}</div>` : ''}
        <table>${rows}</table>
        <div class="total">TOTALE: ${order.total.toFixed(2)} €</div>
        <div>Pagamento: ${
          order.paymentMethod === 'carta'
            ? `PAGATO ONLINE CARTA (•••• ${order.cardLast4})`
            : `CONTANTI ALLA CONSEGNA ${order.cashChangeFor ? `(${order.cashChangeFor})` : ''}`
        }</div>
        <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const res = await api.adminUpdateMenuItem(item.id, { available: !item.available });
    onMenuUpdated(res.menuItems, res.categories);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setMenuSaving(true);
    try {
      if (editingItem.id) {
        const res = await api.adminUpdateMenuItem(editingItem.id, editingItem);
        onMenuUpdated(res.menuItems, res.categories);
      } else {
        const res = await api.adminCreateMenuItem(editingItem);
        onMenuUpdated(res.menuItems, res.categories);
      }
      setEditingItem(null);
    } finally {
      setMenuSaving(false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    const res = await api.adminDeleteMenuItem(id);
    onMenuUpdated(res.menuItems);
  };

  const handleAddCategory = async () => {
    const clean = newCategoryName.trim();
    if (!clean || categories.includes(clean)) return;
    const res = await api.adminUpdateCategories([...categories, clean]);
    onMenuUpdated(menuItems, res.categories);
    setNewCategoryName('');
  };

  const handleSaveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteSaving(true);
    try {
      const { siteConfig: updated } = await api.adminUpdateSite(draftSite);
      onSiteConfigSaved(updated);
      setSiteSavedToast(true);
      window.setTimeout(() => setSiteSavedToast(false), 2500);
    } finally {
      setSiteSaving(false);
    }
  };

  const revenueToday = orders
    .filter((o) => o.status !== 'annullato')
    .reduce((sum, o) => sum + o.total, 0);
  const pendingCount = orders.filter((o) => o.status === 'ricevuto').length;
  const kitchenCount = orders.filter(
    (o) => o.status === 'preparazione' || o.status === 'forno',
  ).length;
  const deliveryCount = orders.filter((o) => o.status === 'consegna').length;

  const sidebarItems: { id: AdminSection; label: string; icon: typeof Package; badge?: number }[] = [
    { id: 'orders', label: 'Ordini & Comande', icon: Package, badge: activeOrdersCount },
    { id: 'menu', label: 'Menu & Categorie', icon: Pizza },
    { id: 'branding', label: 'Testi & Aspetto Sito', icon: Globe },
    { id: 'operations', label: 'Consegne, Orari & Recensioni', icon: Truck },
    { id: 'customers', label: 'Clienti Registrati', icon: Users, badge: customers.length },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden">
      {/* Top Admin Header */}
      <header className="bg-[#111214] text-white px-6 h-14 flex items-center justify-between gap-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-semibold whitespace-nowrap">
            Gestionale · {siteConfig.name}
          </span>
          <span className="hidden sm:inline text-xs text-zinc-400">
            · Pannello Proprietario
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setStoredToken(null);
              onLogout();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-xs font-medium text-zinc-200 hover:bg-white/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Esci
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-[#111214] text-xs font-semibold hover:bg-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" /> Torna al Sito
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Clean Left Sidebar Navigation */}
        <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-zinc-200 shrink-0 overflow-x-auto lg:overflow-y-auto">
          <nav className="p-3 flex lg:flex-col gap-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#111214] text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-[#111214]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`font-mono-tabular text-[11px] ${
                        isActive ? 'text-zinc-300' : 'text-zinc-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* SECTION 1: PRECISION ORDERS CONSOLE */}
            {section === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-semibold text-[#111214]">
                      Ordini &amp; Comande
                    </h1>
                    <p className="text-sm text-zinc-600">
                      Gestisci ogni comanda in ordine di arrivo: verifica indirizzi, resto contanti, note cucina e stato rider.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchOverview}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-[#111214] hover:bg-zinc-50 cursor-pointer self-start"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
                    Aggiorna Comande
                  </button>
                </div>

                {/* 4 KPI Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-zinc-200 rounded-xl p-4">
                    <div className="text-xs text-zinc-500">Nuovi da confermare</div>
                    <div className="text-2xl font-bold font-mono-tabular text-[#D92B2B] mt-1">
                      {pendingCount}
                    </div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-4">
                    <div className="text-xs text-zinc-500">In cucina / forno</div>
                    <div className="text-2xl font-bold font-mono-tabular text-[#111214] mt-1">
                      {kitchenCount}
                    </div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-4">
                    <div className="text-xs text-zinc-500">In consegna (Rider)</div>
                    <div className="text-2xl font-bold font-mono-tabular text-[#111214] mt-1">
                      {deliveryCount}
                    </div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-4">
                    <div className="text-xs text-zinc-500">Incasso ordini validi</div>
                    <div className="text-2xl font-bold font-mono-tabular text-[#111214] mt-1">
                      {revenueToday.toFixed(2).replace('.', ',')} €
                    </div>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'attivi', label: 'Attivi' },
                          { id: 'ricevuto', label: 'Ricevuti' },
                          { id: 'preparazione', label: 'Preparazione' },
                          { id: 'forno', label: 'In Forno' },
                          { id: 'consegna', label: 'In Consegna' },
                          { id: 'consegnato', label: 'Consegnati' },
                          { id: 'tutti', label: 'Tutti' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setOrderStatusFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            orderStatusFilter === tab.id
                              ? 'bg-[#111214] text-white'
                              : 'bg-zinc-100 text-zinc-600 hover:text-[#111214]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={orderDeliveryFilter}
                        onChange={(e) =>
                          setOrderDeliveryFilter(e.target.value as 'tutti' | 'domicilio' | 'asporto')
                        }
                        className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs font-medium"
                      >
                        <option value="tutti">Domicilio + Asporto</option>
                        <option value="domicilio">Solo Domicilio</option>
                        <option value="asporto">Solo Asporto</option>
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Cerca #NXP, nome, via..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 rounded-lg border border-zinc-300 text-xs w-48 focus:outline-none focus:border-[#111214]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Precision Order Cards */}
                {filteredOrders.length === 0 ? (
                  <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center text-sm text-zinc-500">
                    Nessun ordine corrisponde ai filtri selezionati.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => {
                      const statusMeta = ORDER_STATUSES.find((s) => s.value === order.status);
                      const createdTime = new Date(order.createdAt).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const exactChange =
                        order.paymentMethod === 'contanti' &&
                        order.cashBillAmount &&
                        order.cashBillAmount > order.total
                          ? order.cashBillAmount - order.total
                          : null;

                      return (
                        <div
                          key={order.id}
                          className="bg-white border border-zinc-200 rounded-2xl overflow-hidden"
                        >
                          {/* Order Header Strip */}
                          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <span className="font-mono-tabular font-bold text-sm text-[#111214]">
                                {order.id}
                              </span>
                              <span className="text-zinc-400">·</span>
                              <span className="inline-flex items-center gap-1 text-zinc-600 font-mono-tabular">
                                <Clock className="w-3.5 h-3.5" /> Inviato alle {createdTime}
                              </span>
                              <span className="text-zinc-400">·</span>
                              <span className="font-semibold text-[#111214]">
                                Orario richiesto: {order.requestedTime || 'Subito'}
                              </span>
                              <span className="text-zinc-400">·</span>
                              <span className="font-semibold uppercase tracking-wider text-zinc-700">
                                {order.deliveryType === 'domicilio' ? 'Consegna a Domicilio' : 'Asporto'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#111214]">
                                Stato: {statusMeta?.label}
                              </span>
                              <button
                                type="button"
                                onClick={() => handlePrintComanda(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-300 bg-white text-[11px] font-semibold text-zinc-700 hover:text-[#111214] cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" /> Stampa Comanda
                              </button>
                            </div>
                          </div>

                          {/* 3-Column Order Body */}
                          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Column 1: Customer & Address */}
                            <div className="lg:col-span-4 space-y-2.5 text-sm border-b lg:border-b-0 lg:border-r border-zinc-100 pb-4 lg:pb-0 lg:pr-4">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                1. Destinatario &amp; Indirizzo
                              </div>
                              <div className="font-semibold text-[#111214]">{order.customerName}</div>
                              <div className="flex items-center gap-2 text-xs text-zinc-700">
                                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                <a
                                  href={`tel:${order.customerPhone.replace(/\s+/g, '')}`}
                                  className="font-mono-tabular font-medium hover:underline"
                                >
                                  {order.customerPhone}
                                </a>
                              </div>
                              <div className="flex items-start gap-2 text-xs text-zinc-700">
                                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-medium text-[#111214]">{order.address}</div>
                                  {order.floorOrNotes && (
                                    <div className="text-zinc-500 mt-0.5">{order.floorOrNotes}</div>
                                  )}
                                </div>
                              </div>
                              {order.kitchenNotes && (
                                <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                                  <strong>Note cucina:</strong> {order.kitchenNotes}
                                </div>
                              )}
                            </div>

                            {/* Column 2: Itemized Products Table */}
                            <div className="lg:col-span-5 space-y-2.5 border-b lg:border-b-0 lg:border-r border-zinc-100 pb-4 lg:pb-0 lg:pr-4">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                2. Dettaglio Prodotti
                              </div>
                              <div className="divide-y divide-zinc-100">
                                {order.items.map((it, idx) => (
                                  <div
                                    key={it.cartKey + idx}
                                    className="py-2 flex items-start justify-between gap-3 text-sm"
                                  >
                                    <div>
                                      <span className="font-mono-tabular font-bold text-[#111214] mr-1.5">
                                        {it.quantity}×
                                      </span>
                                      <span className="font-medium text-[#111214]">{it.name}</span>
                                      {it.format !== 'standard' && (
                                        <span className="ml-1.5 text-xs text-zinc-500">
                                          ({it.format === 'maxi' ? 'Maxi 50cm' : 'Normale 33cm'})
                                        </span>
                                      )}
                                      {it.notes && (
                                        <div className="text-xs text-zinc-500 mt-0.5">
                                          Nota: {it.notes}
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-mono-tabular text-xs font-semibold text-zinc-700 shrink-0">
                                      {(it.unitPrice * it.quantity).toFixed(2).replace('.', ',')} €
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
                                <span>
                                  Subtotale {order.subtotal.toFixed(2).replace('.', ',')} € · Consegna{' '}
                                  {order.deliveryFee === 0
                                    ? 'Gratis'
                                    : `${order.deliveryFee.toFixed(2).replace('.', ',')} €`}
                                </span>
                                <span className="text-base font-bold font-mono-tabular text-[#111214]">
                                  {order.total.toFixed(2).replace('.', ',')} €
                                </span>
                              </div>
                            </div>

                            {/* Column 3: Payment, Rider Note & Actions */}
                            <div className="lg:col-span-3 space-y-3 flex flex-col justify-between">
                              <div className="space-y-2.5">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                  3. Cassa &amp; Avanzamento
                                </div>

                                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-semibold text-[#111214]">
                                    <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                                    {order.paymentMethod === 'carta'
                                      ? `Pagato Carta (•••• ${order.cardLast4})`
                                      : `Incassare Contanti: ${order.total.toFixed(2).replace('.', ',')} €`}
                                  </div>
                                  {order.paymentMethod === 'contanti' && order.cashChangeFor && (
                                    <div className="text-zinc-600">
                                      {order.cashChangeFor}
                                      {exactChange !== null && (
                                        <span className="block font-semibold text-[#D92B2B] font-mono-tabular">
                                          Resto da preparare: {exactChange.toFixed(2).replace('.', ',')} €
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Assegna rider o nota..."
                                    value={noteDrafts[order.id] ?? ''}
                                    onChange={(e) =>
                                      setNoteDrafts({ ...noteDrafts, [order.id]: e.target.value })
                                    }
                                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInternalNote(order.id)}
                                    disabled={savingNoteId === order.id}
                                    className="px-2.5 py-1.5 rounded-lg bg-zinc-100 text-xs font-semibold text-[#111214] hover:bg-zinc-200 cursor-pointer shrink-0"
                                  >
                                    {savingNoteId === order.id ? '...' : 'Salva'}
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2 pt-2">
                                {statusMeta?.nextStatus && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateOrderStatus(order.id, statusMeta.nextStatus!)
                                    }
                                    style={{ backgroundColor: siteConfig.accentColor }}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
                                  >
                                    <span>{statusMeta.nextAction}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <select
                                  value={order.status}
                                  onChange={(e) =>
                                    handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs font-medium text-zinc-700 cursor-pointer"
                                >
                                  {ORDER_STATUSES.map((st) => (
                                    <option key={st.value} value={st.value}>
                                      Imposta: {st.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: ORGANIZED MENU TABLE & CRUD */}
            {section === 'menu' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-semibold text-[#111214]">
                      Menu &amp; Categorie
                    </h1>
                    <p className="text-sm text-zinc-600">
                      Gestisci prodotti, prezzi Normale e Maxi, disponibilità immediata e categorie del sito.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingItem({
                        name: '',
                        category: categories[0] || 'Pizze Classiche',
                        description: '',
                        priceNormal: 8.0,
                        priceMaxi: 14.0,
                        imageUrl: IMAGE_GALLERY[1].url,
                        available: true,
                        featured: false,
                        ingredients: [],
                      })
                    }
                    style={{ backgroundColor: siteConfig.accentColor }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer self-start"
                  >
                    <Plus className="w-4 h-4" /> Nuovo Prodotto
                  </button>
                </div>

                {/* Category Filter + New Category */}
                <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {['Tutte', ...categories].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setMenuCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          menuCategoryFilter === cat
                            ? 'bg-[#111214] text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:text-[#111214]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Cerca prodotto..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 text-xs w-40"
                    />
                    <input
                      type="text"
                      placeholder="Nuova categoria..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 text-xs w-36"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-1.5 rounded-lg bg-[#111214] text-white text-xs font-semibold cursor-pointer"
                    >
                      + Categoria
                    </button>
                  </div>
                </div>

                {/* Clean Structured Table */}
                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          <th className="py-3 px-4">Prodotto</th>
                          <th className="py-3 px-4">Categoria</th>
                          <th className="py-3 px-4">Normale</th>
                          <th className="py-3 px-4">Maxi</th>
                          <th className="py-3 px-4">Stato</th>
                          <th className="py-3 px-4 text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-sm">
                        {filteredMenu.map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-50/70">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="w-11 h-11 rounded-lg object-cover bg-zinc-100 shrink-0"
                                />
                                <div>
                                  <div className="font-semibold text-[#111214]">{item.name}</div>
                                  <div className="text-xs text-zinc-500 line-clamp-1 max-w-xs">
                                    {item.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-zinc-600">{item.category}</td>
                            <td className="py-3 px-4 font-mono-tabular font-semibold text-[#111214]">
                              {item.priceNormal.toFixed(2).replace('.', ',')} €
                            </td>
                            <td className="py-3 px-4 font-mono-tabular text-zinc-600">
                              {item.priceMaxi !== null
                                ? `${item.priceMaxi.toFixed(2).replace('.', ',')} €`
                                : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleAvailability(item)}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                                  item.available
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {item.available ? 'Disponibile' : 'Esaurito'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#111214] hover:underline cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Modifica
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMenuItem(item.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Elimina
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal for Editing / Creating Product (no layout jump!) */}
                {editingItem && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <form
                      onSubmit={handleSaveMenuItem}
                      className="w-full max-w-2xl bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                        <h3 className="font-display text-lg font-semibold text-[#111214]">
                          {editingItem.id ? `Modifica: ${editingItem.name}` : 'Nuovo Prodotto'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Nome Prodotto *
                          </label>
                          <input
                            type="text"
                            required
                            value={editingItem.name || ''}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, name: e.target.value })
                            }
                            className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Categoria *
                          </label>
                          <select
                            value={editingItem.category || categories[0]}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, category: e.target.value })
                            }
                            className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm bg-white"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Prezzo Normale (€) *
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            required
                            value={editingItem.priceNormal ?? 0}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                priceNormal: Number(e.target.value),
                              })
                            }
                            className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Prezzo Maxi (€)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="Vuoto se formato unico"
                            value={editingItem.priceMaxi ?? ''}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                priceMaxi: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm font-mono-tabular"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">
                          Descrizione
                        </label>
                        <textarea
                          rows={2}
                          value={editingItem.description || ''}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, description: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Foto Prodotto
                          </label>
                          <select
                            value={editingItem.imageUrl || IMAGE_GALLERY[1].url}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, imageUrl: e.target.value })
                            }
                            className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm bg-white"
                          >
                            {IMAGE_GALLERY.map((img) => (
                              <option key={img.url} value={img.url}>
                                {img.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Ingredienti (separati da virgola)
                          </label>
                          <input
                            type="text"
                            value={(editingItem.ingredients || []).join(', ')}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                ingredients: e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-6 text-xs font-medium text-zinc-700">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingItem.available !== false}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, available: e.target.checked })
                            }
                          />
                          Disponibile alla vendita
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(editingItem.featured)}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, featured: e.target.checked })
                            }
                          />
                          Mostra in Home tra le Specialità
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-semibold cursor-pointer"
                        >
                          Annulla
                        </button>
                        <button
                          type="submit"
                          disabled={menuSaving}
                          style={{ backgroundColor: siteConfig.accentColor }}
                          className="px-5 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer"
                        >
                          {menuSaving ? 'Salvataggio...' : 'Salva Prodotto'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: BRANDING & TEXTS */}
            {section === 'branding' && (
              <form onSubmit={handleSaveSiteConfig} className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-2xl font-semibold text-[#111214]">
                      Testi &amp; Aspetto del Sito
                    </h1>
                    <p className="text-sm text-zinc-600">
                      Personalizza titolo, testi della home, colore principale, foto hero e sezione storia 3D.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={siteSaving}
                    style={{ backgroundColor: siteConfig.accentColor }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  >
                    {siteSavedToast ? (
                      <>
                        <Check className="w-4 h-4" /> Salvato!
                      </>
                    ) : siteSaving ? (
                      'Salvataggio...'
                    ) : (
                      'Salva Modifiche'
                    )}
                  </button>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Nome Pizzeria
                      </label>
                      <input
                        type="text"
                        value={draftSite.name}
                        onChange={(e) => setDraftSite({ ...draftSite, name: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Colore Accento Pulsanti
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={draftSite.accentColor}
                          onChange={(e) =>
                            setDraftSite({ ...draftSite, accentColor: e.target.value })
                          }
                          className="h-9 w-14 rounded border border-zinc-300 cursor-pointer"
                        />
                        <span className="font-mono-tabular text-xs text-zinc-600">
                          {draftSite.accentColor}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      Sottotitolo Brand
                    </label>
                    <input
                      type="text"
                      value={draftSite.tagline}
                      onChange={(e) => setDraftSite({ ...draftSite, tagline: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      Titolo Principale Hero
                    </label>
                    <input
                      type="text"
                      value={draftSite.heroHeadline}
                      onChange={(e) => setDraftSite({ ...draftSite, heroHeadline: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      Descrizione Hero
                    </label>
                    <textarea
                      rows={2}
                      value={draftSite.heroSubheadline}
                      onChange={(e) =>
                        setDraftSite({ ...draftSite, heroSubheadline: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      Immagine Hero Principale
                    </label>
                    <select
                      value={draftSite.heroImageUrl}
                      onChange={(e) =>
                        setDraftSite({ ...draftSite, heroImageUrl: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm bg-white"
                    >
                      {IMAGE_GALLERY.map((img) => (
                        <option key={img.url} value={img.url}>
                          {img.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Banner Superiore
                      </label>
                      <input
                        type="text"
                        value={draftSite.promoBanner}
                        onChange={(e) =>
                          setDraftSite({ ...draftSite, promoBanner: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draftSite.promoActive}
                          onChange={(e) =>
                            setDraftSite({ ...draftSite, promoActive: e.target.checked })
                          }
                        />
                        Mostra banner promozionale in alto
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-[#111214]">
                    Sezione Animazione 3D allo Scorrimento
                  </h2>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      Titolo Sezione 3D
                    </label>
                    <input
                      type="text"
                      value={draftSite.storyTitle}
                      onChange={(e) => setDraftSite({ ...draftSite, storyTitle: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      Paragrafo Introduttivo
                    </label>
                    <textarea
                      rows={2}
                      value={draftSite.storyParagraph}
                      onChange={(e) =>
                        setDraftSite({ ...draftSite, storyParagraph: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                    />
                  </div>
                </div>
              </form>
            )}

            {/* SECTION 4: DELIVERY, HOURS, CONTACTS & REVIEWS */}
            {section === 'operations' && (
              <form onSubmit={handleSaveSiteConfig} className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-2xl font-semibold text-[#111214]">
                      Consegne, Orari &amp; Contatti
                    </h1>
                    <p className="text-sm text-zinc-600">
                      Configura costi di consegna, pagamenti accettati, orari settimanali e recensioni.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={siteSaving}
                    style={{ backgroundColor: siteConfig.accentColor }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                  >
                    {siteSavedToast ? (
                      <>
                        <Check className="w-4 h-4" /> Salvato!
                      </>
                    ) : siteSaving ? (
                      'Salvataggio...'
                    ) : (
                      'Salva Impostazioni'
                    )}
                  </button>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-[#111214]">
                    Tariffe Consegna &amp; Pagamenti
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Costo Consegna (€)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={draftSite.deliveryFee}
                        onChange={(e) =>
                          setDraftSite({ ...draftSite, deliveryFee: Number(e.target.value) })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Gratuita oltre (€)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={draftSite.freeDeliveryThreshold}
                        onChange={(e) =>
                          setDraftSite({
                            ...draftSite,
                            freeDeliveryThreshold: Number(e.target.value),
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Tempo Consegna Stimato
                      </label>
                      <input
                        type="text"
                        value={draftSite.estimatedDeliveryMinutes}
                        onChange={(e) =>
                          setDraftSite({
                            ...draftSite,
                            estimatedDeliveryMinutes: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 text-xs font-medium text-zinc-700 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftSite.acceptCardOnline}
                        onChange={(e) =>
                          setDraftSite({ ...draftSite, acceptCardOnline: e.target.checked })
                        }
                      />
                      Accetta Carta Online
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftSite.acceptCashOnDelivery}
                        onChange={(e) =>
                          setDraftSite({ ...draftSite, acceptCashOnDelivery: e.target.checked })
                        }
                      />
                      Accetta Contanti alla Consegna
                    </label>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-[#111214]">
                    Indirizzo &amp; Orari di Apertura
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Indirizzo Locale
                      </label>
                      <input
                        type="text"
                        value={draftSite.address}
                        onChange={(e) => setDraftSite({ ...draftSite, address: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Telefono
                      </label>
                      <input
                        type="text"
                        value={draftSite.phone}
                        onChange={(e) => setDraftSite({ ...draftSite, phone: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {draftSite.hours.map((row, idx) => (
                      <div key={row.day} className="flex items-center gap-3">
                        <span className="w-24 text-xs font-semibold text-zinc-700">{row.day}</span>
                        <input
                          type="text"
                          value={row.hours}
                          onChange={(e) => {
                            const next = [...draftSite.hours];
                            next[idx] = { ...row, hours: e.target.value };
                            setDraftSite({ ...draftSite, hours: next });
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono-tabular"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-[#111214]">
                      Recensioni Clienti
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftSite({
                          ...draftSite,
                          reviews: [
                            ...draftSite.reviews,
                            {
                              id: `rev-${Date.now()}`,
                              author: 'Nuovo Cliente',
                              neighborhood: 'Catania',
                              rating: 5,
                              text: 'Ottima pizza e consegna veloce!',
                              date: 'Novembre 2026',
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 text-xs font-semibold text-[#111214] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Aggiungi
                    </button>
                  </div>
                  <div className="space-y-3">
                    {draftSite.reviews.map((rev, idx) => (
                      <div
                        key={rev.id}
                        className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={rev.author}
                            onChange={(e) => {
                              const next = [...draftSite.reviews];
                              next[idx] = { ...rev, author: e.target.value };
                              setDraftSite({ ...draftSite, reviews: next });
                            }}
                            className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs font-semibold"
                          />
                          <input
                            type="text"
                            value={rev.neighborhood}
                            onChange={(e) => {
                              const next = [...draftSite.reviews];
                              next[idx] = { ...rev, neighborhood: e.target.value };
                              setDraftSite({ ...draftSite, reviews: next });
                            }}
                            className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDraftSite({
                                ...draftSite,
                                reviews: draftSite.reviews.filter((r) => r.id !== rev.id),
                              })
                            }
                            className="ml-auto text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Rimuovi
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={rev.text}
                          onChange={(e) => {
                            const next = [...draftSite.reviews];
                            next[idx] = { ...rev, text: e.target.value };
                            setDraftSite({ ...draftSite, reviews: next });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {/* SECTION 5: REGISTERED CUSTOMERS TABLE */}
            {section === 'customers' && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-[#111214]">
                    Clienti Registrati
                  </h1>
                  <p className="text-sm text-zinc-600">
                    Elenco ordinato degli account clienti con indirizzo e storico ordini.
                  </p>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          <th className="py-3 px-4">Cliente</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Telefono</th>
                          <th className="py-3 px-4">Indirizzo Salvato</th>
                          <th className="py-3 px-4 text-right">Ordini</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-sm">
                        {customers.map((c) => {
                          const count = orders.filter((o) => o.userId === c.id).length;
                          return (
                            <tr key={c.id}>
                              <td className="py-3 px-4 font-semibold text-[#111214]">{c.fullName}</td>
                              <td className="py-3 px-4 text-xs text-zinc-600">{c.email}</td>
                              <td className="py-3 px-4 font-mono-tabular text-xs text-zinc-700">
                                {c.phone || '—'}
                              </td>
                              <td className="py-3 px-4 text-xs text-zinc-600">
                                {c.address || '—'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono-tabular font-semibold">
                                {count}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
