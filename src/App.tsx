import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { api, getStoredToken, setStoredToken } from './api';
import { AccountModal } from './components/AccountModal';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { Header } from './components/Header';
import { OwnerDashboard } from './components/OwnerDashboard';
import { PizzaScroll3D } from './components/PizzaScroll3D';
import type { AppPage, CartItem, MenuItem, PizzaFormat, PublicUser, SiteConfig } from './types';

const CART_STORAGE_KEY = 'nxp_cart_items';

export default function App() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [activePage, setActivePage] = useState<AppPage>('home');
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [promoDismissed, setPromoDismissed] = useState(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [ownerPanelOpen, setOwnerPanelOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore storage errors
    }
  }, [cartItems]);

  useEffect(() => {
    const load = async () => {
      try {
        const boot = await api.bootstrap();
        setSiteConfig(boot.siteConfig);
        setCategories(boot.categories);
        setMenuItems(boot.menuItems);
        if (boot.categories.length > 0) {
          setSelectedMenuCategory(boot.categories[0]);
        }

        if (getStoredToken()) {
          try {
            const { user } = await api.me();
            setCurrentUser(user);
          } catch {
            setStoredToken(null);
          }
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Errore di caricamento');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const navigateTo = (page: AppPage, category?: string) => {
    setActivePage(page);
    if (category) {
      setSelectedMenuCategory(category);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(''), 2200);
  };

  const addToCart = (incoming: CartItem) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.cartKey === incoming.cartKey);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + incoming.quantity };
        return next;
      }
      return [...prev, incoming];
    });
    showToast(`${incoming.name} aggiunto al carrello`);
  };

  const handleQuickAddMenuItem = (item: MenuItem, format: PizzaFormat | 'standard') => {
    const price = format === 'maxi' && item.priceMaxi !== null ? item.priceMaxi : item.priceNormal;
    const note = (itemNotes[item.id] || '').trim();
    const cartKey = note
      ? `${item.id}-${format}-${note.toLowerCase().slice(0, 24)}`
      : `${item.id}-${format}`;

    addToCart({
      cartKey,
      menuItemId: item.id,
      name: item.name,
      format,
      unitPrice: price,
      quantity: 1,
      imageUrl: item.imageUrl,
      notes: note || undefined,
    });
    if (note) {
      setItemNotes((prev) => ({ ...prev, [item.id]: '' }));
    }
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => (it.cartKey === cartKey ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0),
    );
  };

  const removeCartItem = (cartKey: string) => {
    setCartItems((prev) => prev.filter((it) => it.cartKey !== cartKey));
  };

  const availableItems = useMemo(
    () => menuItems.filter((m) => m.available),
    [menuItems],
  );

  const featuredItems = useMemo(() => {
    const featured = availableItems.filter((m) => m.featured);
    return (featured.length > 0 ? featured : availableItems).slice(0, 3);
  }, [availableItems]);

  const activeCategoryName = selectedMenuCategory || categories[0] || '';

  const categoryMenuItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return availableItems.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.ingredients.some((ing) => ing.toLowerCase().includes(q)),
      );
    }
    return availableItems.filter((item) => item.category === activeCategoryName);
  }, [availableItems, activeCategoryName, searchQuery]);

  const activeCategoryIndex = categories.indexOf(activeCategoryName);
  const prevCategory = activeCategoryIndex > 0 ? categories[activeCategoryIndex - 1] : null;
  const nextCategory =
    activeCategoryIndex >= 0 && activeCategoryIndex < categories.length - 1
      ? categories[activeCategoryIndex + 1]
      : null;

  const totalCartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-[#111214]">
        <div className="text-center space-y-2">
          <div className="font-display text-2xl font-semibold">Nati x la Pizza</div>
          <div className="text-sm text-zinc-500">Caricamento menu e animazioni 3D...</div>
        </div>
      </div>
    );
  }

  if (loadError || !siteConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
        <div className="max-w-md bg-white border border-zinc-200 rounded-2xl p-6 text-center space-y-4">
          <h1 className="font-display text-xl font-semibold">Servizio temporaneamente non disponibile</h1>
          <p className="text-sm text-zinc-600">{loadError || 'Impossibile caricare i dati.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-lg bg-[#111214] text-white text-xs font-semibold cursor-pointer"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const renderMenuCard = (item: MenuItem, idx: number) => (
    <motion.article
      key={item.id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.25) }}
      className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all"
    >
      <div>
        <div className="aspect-[4/3] w-full bg-zinc-100 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="uppercase tracking-wider">{item.category}</span>
            {item.featured && (
              <span className="font-medium text-[#D92B2B]">Scelta della casa</span>
            )}
          </div>

          <h3 className="font-display text-xl font-semibold text-[#111214]">{item.name}</h3>

          <p className="text-sm text-zinc-600 leading-relaxed">{item.description}</p>

          {item.ingredients.length > 0 && (
            <div className="text-xs text-zinc-400 pt-1">{item.ingredients.join(' · ')}</div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-zinc-100 space-y-3">
        <div className="font-mono-tabular text-sm font-semibold text-[#111214]">
          {item.priceNormal.toFixed(2).replace('.', ',')} €
          {item.priceMaxi !== null && (
            <span className="text-xs font-normal text-zinc-500">
              {' '}
              / Maxi {item.priceMaxi.toFixed(2).replace('.', ',')} €
            </span>
          )}
        </div>

        {activePage === 'menu' && (
          <input
            type="text"
            placeholder="Nota cucina (es. ben cotta, senza cipolla)..."
            value={itemNotes[item.id] || ''}
            onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:border-[#111214]"
          />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleQuickAddMenuItem(item, item.priceMaxi !== null ? 'normale' : 'standard')
            }
            style={{ backgroundColor: siteConfig.accentColor }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            {item.priceMaxi !== null ? 'Aggiungi Normale' : 'Aggiungi al Carrello'}
          </button>

          {item.priceMaxi !== null && (
            <button
              type="button"
              onClick={() => handleQuickAddMenuItem(item, 'maxi')}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-[#111214] hover:border-[#111214] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              + Maxi
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#111214]">
      {/* Slim Dismissible Promo Banner */}
      {siteConfig.promoActive && !promoDismissed && (
        <div className="bg-[#111214] text-white text-xs px-4 h-9 flex items-center justify-center relative">
          <p className="truncate pr-8 text-center font-medium">{siteConfig.promoBanner}</p>
          <button
            type="button"
            onClick={() => setPromoDismissed(true)}
            aria-label="Chiudi avviso"
            className="absolute right-3 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Header
        siteConfig={siteConfig}
        activePage={activePage}
        cartCount={totalCartCount}
        currentUser={currentUser}
        onNavigate={(page) => navigateTo(page)}
        onOpenCart={() => setCartOpen(true)}
        onOpenAccount={() => setAccountModalOpen(true)}
        onOpenOwnerPanel={() => setOwnerPanelOpen(true)}
      />

      <main className="flex-1">
        {/* PAGE 1: HOME */}
        {activePage === 'home' && (
          <>
            {/* HERO SECTION */}
            <section className="max-w-7xl mx-auto px-6 pt-10 pb-14 lg:pt-14 lg:pb-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="lg:col-span-6 flex flex-col justify-between py-2"
                >
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
                      <span>Catania</span>
                      <span aria-hidden="true">·</span>
                      <span>{siteConfig.neighborhood}</span>
                      <span aria-hidden="true">·</span>
                      <span>{siteConfig.phone}</span>
                    </div>

                    <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold leading-[1.08] tracking-tight text-[#111214]">
                      {siteConfig.heroHeadline}
                    </h1>

                    <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-xl">
                      {siteConfig.heroSubheadline}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => navigateTo('menu')}
                        style={{ backgroundColor: siteConfig.accentColor }}
                        className="px-6 py-3.5 rounded-xl text-sm font-semibold text-white hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Sfoglia il Menu e Ordina
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('storia')}
                        className="px-6 py-3.5 rounded-xl border border-zinc-300 bg-white text-sm font-semibold text-[#111214] hover:border-zinc-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Storia &amp; Forno 3D
                      </button>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-zinc-200 flex flex-wrap items-center gap-6 text-xs text-zinc-600">
                    <div>
                      <span className="block text-zinc-400">Indirizzo</span>
                      <strong className="text-[#111214] font-medium">{siteConfig.address}</strong>
                    </div>
                    <div>
                      <span className="block text-zinc-400">Consegna a casa</span>
                      <strong className="text-[#111214] font-medium font-mono-tabular">
                        {siteConfig.estimatedDeliveryMinutes}
                      </strong>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-zinc-200 min-h-[320px] lg:min-h-[460px] bg-zinc-900"
                >
                  <img
                    src={siteConfig.heroImageUrl}
                    alt={`${siteConfig.name} — Forno a pietra a Catania`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full lg:h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white">
                    <div>
                      <div className="text-xs text-zinc-300">{siteConfig.tagline}</div>
                      <div className="font-display text-lg font-medium mt-0.5">
                        Pizze Normali &amp; Maxi · Calzoni · Smash Burger
                      </div>
                    </div>
                    <a
                      href={siteConfig.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-white underline underline-offset-4 whitespace-nowrap shrink-0"
                    >
                      Google Maps <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.div>
              </div>

              {/* 4-Column Service Strip */}
              <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-b border-zinc-200 py-5">
                <div>
                  <div className="text-xs text-zinc-500">Consegna a Domicilio</div>
                  <div className="text-sm font-semibold text-[#111214] mt-0.5 font-mono-tabular">
                    Gratis oltre {siteConfig.freeDeliveryThreshold.toFixed(2).replace('.', ',')} €
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Pagamenti Accettati</div>
                  <div className="text-sm font-semibold text-[#111214] mt-0.5">
                    Carta Online o Contanti alla consegna
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Formati Disponibili</div>
                  <div className="text-sm font-semibold text-[#111214] mt-0.5">
                    Normale (33 cm) &amp; Maxi (50 cm)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Asporto Rapido</div>
                  <div className="text-sm font-semibold text-[#111214] mt-0.5">
                    Ritiro in Via Martelli Castaldi 92/94
                  </div>
                </div>
              </div>
            </section>

            {/* SCROLL-DRIVEN 3D STORYTELLING */}
            <PizzaScroll3D
              siteConfig={siteConfig}
              onExploreMenu={() => navigateTo('menu')}
            />

            {/* FEATURED HIGHLIGHTS (Links to Menu Pages) */}
            <section className="max-w-7xl mx-auto px-6 py-20">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                <div>
                  <p className="text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                    In Evidenza dal Forno
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#111214]">
                    Le più richieste a Catania
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('menu')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#111214] hover:underline cursor-pointer"
                >
                  Apri tutto il Menu ({availableItems.length} piatti)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredItems.map((item, idx) => renderMenuCard(item, idx))}
              </div>
            </section>

            {/* REVIEWS */}
            <section className="bg-white border-t border-zinc-200">
              <div className="max-w-7xl mx-auto px-6 py-20">
                <div className="max-w-xl mb-10">
                  <p className="text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                    Dicono di Noi a Catania
                  </p>
                  <h2 className="font-display text-3xl font-semibold text-[#111214]">
                    Qualità riconosciuta ogni sera
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {siteConfig.reviews.map((rev, idx) => (
                    <motion.div
                      key={rev.id}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.35, delay: idx * 0.08 }}
                      className="p-6 rounded-2xl bg-[#F8F9FA] border border-zinc-200 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, starIdx) => (
                            <Star key={starIdx} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        <p className="text-sm text-zinc-700 leading-relaxed">
                          &ldquo;{rev.text}&rdquo;
                        </p>
                      </div>
                      <div className="text-xs text-zinc-500 pt-3 border-t border-zinc-200">
                        <strong className="text-[#111214]">{rev.author}</strong> · {rev.neighborhood} ·{' '}
                        {rev.date}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* PAGE 2: DEDICATED PAGINATED MENU BY CATEGORY */}
        {activePage === 'menu' && (
          <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
              <div>
                <p className="text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                  Menu Suddiviso per Pagine · Ordine da Casa
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#111214]">
                  {searchQuery.trim() ? 'Risultati ricerca' : activeCategoryName}
                </h1>
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cerca in tutto il menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-[#111214]"
                />
              </div>
            </div>

            {/* Category Page Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-10">
              {categories.map((cat) => {
                const count = availableItems.filter((i) => i.category === cat).length;
                const isSelected = !searchQuery.trim() && activeCategoryName === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedMenuCategory(cat);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#111214] text-white border-[#111214]'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{cat}</div>
                    <div
                      className={`text-[11px] font-mono-tabular mt-1 ${
                        isSelected ? 'text-zinc-300' : 'text-zinc-400'
                      }`}
                    >
                      {count} {count === 1 ? 'prodotto' : 'prodotti'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Products for this Category Page */}
            {categoryMenuItems.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
                <p className="text-sm text-zinc-600">
                  Nessun prodotto disponibile in questa sezione.
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-4 px-4 py-2 rounded-lg bg-[#111214] text-white text-xs font-semibold cursor-pointer"
                  >
                    Torna alle categorie
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryMenuItems.map((item, idx) => renderMenuCard(item, idx))}
              </div>
            )}

            {/* Category Page Pagination */}
            {!searchQuery.trim() && (prevCategory || nextCategory) && (
              <div className="mt-12 pt-8 border-t border-zinc-200 flex items-center justify-between gap-4">
                {prevCategory ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMenuCategory(prevCategory);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-[#111214] hover:border-[#111214] cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {prevCategory}
                  </button>
                ) : (
                  <div />
                )}

                {nextCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMenuCategory(nextCategory);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{ backgroundColor: siteConfig.accentColor }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
                  >
                    {nextCategory}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* PAGE 3: STORIA & SCROLL 3D */}
        {activePage === 'storia' && (
          <div>
            <PizzaScroll3D
              siteConfig={siteConfig}
              onExploreMenu={() => navigateTo('menu')}
            />
            <section className="max-w-7xl mx-auto px-6 py-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-2">
                  <div className="font-mono-tabular text-xs text-zinc-400">01. Digeribilità</div>
                  <h3 className="font-display text-xl font-semibold text-[#111214]">
                    Impasto leggero 48h
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    La maturazione controllata riduce gli zuccheri complessi e dona al cornicione croccantezza e leggerezza.
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-2">
                  <div className="font-mono-tabular text-xs text-zinc-400">02. Territorio</div>
                  <h3 className="font-display text-xl font-semibold text-[#111214]">
                    Pistacchio di Bronte &amp; Porchetta
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Abbiniamo la tradizione catanese alle nostre specialità più amate come La Porcosa, la Pistacchiosa e i panini smash.
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-2">
                  <div className="font-mono-tabular text-xs text-zinc-400">03. Puntualità</div>
                  <h3 className="font-display text-xl font-semibold text-[#111214]">
                    Da Cibali a casa tua
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Consegniamo a domicilio in {siteConfig.estimatedDeliveryMinutes} con pagamento sicuro con carta o contanti alla consegna.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* PAGE 4: CONTATTI & ORARI */}
        {activePage === 'contatti' && (
          <section className="max-w-7xl mx-auto px-6 py-14 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <p className="text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                    Sede, Consegne &amp; Contatti
                  </p>
                  <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111214]">
                    {siteConfig.name} — Catania
                  </h1>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 text-sm text-zinc-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#111214]">{siteConfig.address}</div>
                      <div className="text-xs text-zinc-500">{siteConfig.neighborhood}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-zinc-500 shrink-0" />
                    <a
                      href={`tel:${siteConfig.phone.replace(/\s+/g, '')}`}
                      className="font-mono-tabular font-semibold text-[#111214] hover:underline"
                    >
                      {siteConfig.phone}
                    </a>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <a
                      href={siteConfig.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: siteConfig.accentColor }}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-white hover:opacity-95"
                    >
                      Apri su Google Maps <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => navigateTo('menu')}
                      className="px-5 py-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-[#111214] hover:border-zinc-500 cursor-pointer"
                    >
                      Ordina Online
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border border-zinc-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-zinc-600" />
                  <h2 className="font-display text-xl font-semibold text-[#111214]">
                    Orari di Apertura
                  </h2>
                </div>
                <div className="divide-y divide-zinc-200">
                  {siteConfig.hours.map((row) => (
                    <div key={row.day} className="py-3 flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-800">{row.day}</span>
                      <span className="font-mono-tabular text-zinc-600">{row.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* CLEAN FOOTER */}
      <footer className="bg-[#111214] text-zinc-400 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs">
          <div>
            <div className="font-display text-base font-semibold text-white">{siteConfig.name}</div>
            <div className="mt-1">
              {siteConfig.address} · Tel. {siteConfig.phone}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateTo('menu')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => navigateTo('storia')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Storia 3D
            </button>
            <button
              type="button"
              onClick={() => navigateTo('contatti')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Contatti
            </button>
            <button
              type="button"
              onClick={() =>
                currentUser?.role === 'owner' ? setOwnerPanelOpen(true) : setAccountModalOpen(true)
              }
              className="hover:text-white transition-colors cursor-pointer"
            >
              {currentUser?.role === 'owner' ? 'Pannello Gestionale' : 'Account / Gestionale'}
            </button>
          </div>
        </div>
      </footer>

      {/* Toast feedback */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-40 px-4 py-3 rounded-xl bg-[#111214] text-white text-xs font-semibold shadow-lg border border-white/15">
          {toastMsg}
        </div>
      )}

      {/* Drawers & Modals */}
      <CartCheckoutDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        siteConfig={siteConfig}
        items={cartItems}
        currentUser={currentUser}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeCartItem}
        onClearCart={() => setCartItems([])}
        onOrderCreated={() => {}}
      />

      <AccountModal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        siteConfig={siteConfig}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        onOpenOwnerPanel={() => setOwnerPanelOpen(true)}
        onReorderItems={(items) => {
          items.forEach((it) => addToCart(it));
          setCartOpen(true);
        }}
      />

      {currentUser?.role === 'owner' && (
        <OwnerDashboard
          open={ownerPanelOpen}
          onClose={() => setOwnerPanelOpen(false)}
          siteConfig={siteConfig}
          categories={categories}
          menuItems={menuItems}
          onSiteConfigSaved={(updated) => setSiteConfig(updated)}
          onMenuUpdated={(items, cats) => {
            setMenuItems(items);
            if (cats) setCategories(cats);
          }}
          onLogout={() => setCurrentUser(null)}
        />
      )}
    </div>
  );
}
