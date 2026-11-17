import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import type { AppPage, PublicUser, SiteConfig } from '../types';

interface HeaderProps {
  siteConfig: SiteConfig;
  activePage: AppPage;
  cartCount: number;
  currentUser: PublicUser | null;
  onNavigate: (page: AppPage) => void;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onOpenOwnerPanel: () => void;
}

export function Header({
  siteConfig,
  activePage,
  cartCount,
  currentUser,
  onNavigate,
  onOpenCart,
  onOpenAccount,
  onOpenOwnerPanel,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const accountLabel =
    currentUser?.role === 'owner'
      ? 'Gestionale'
      : currentUser
      ? currentUser.fullName.split(' ')[0]
      : 'Account';

  const handleNav = (page: AppPage) => {
    setMobileMenuOpen(false);
    onNavigate(page);
  };

  const handleAccountClick = () => {
    setMobileMenuOpen(false);
    if (currentUser?.role === 'owner') {
      onOpenOwnerPanel();
    } else {
      onOpenAccount();
    }
  };

  const navItems: { page: AppPage; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'menu', label: 'Menu' },
    { page: 'storia', label: 'Storia 3D' },
    { page: 'contatti', label: 'Contatti' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-xl font-bold tracking-tight text-[#111214] whitespace-nowrap shrink-0 cursor-pointer"
        >
          {siteConfig.name}
        </button>

        {/* Zone 2: 5 concise single-line page links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
          {navItems.map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => handleNav(item.page)}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 ${
                activePage === item.page
                  ? 'text-[#111214] font-semibold border-[#111214]'
                  : 'border-transparent hover:text-[#111214]'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={handleAccountClick}
            className="hover:text-[#111214] transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 border-transparent"
          >
            {accountLabel}
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            style={{ backgroundColor: siteConfig.accentColor }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Carrello</span>
            <span className="font-mono-tabular">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Apri menu di navigazione"
            className="md:hidden p-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-6 py-4 space-y-2 text-sm font-medium text-zinc-700">
          {navItems.map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => handleNav(item.page)}
              className={`block w-full text-left py-2 border-b border-zinc-100 cursor-pointer ${
                activePage === item.page ? 'text-[#111214] font-semibold' : ''
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAccountClick}
            className="block w-full text-left py-2 text-[#111214] font-semibold cursor-pointer"
          >
            {accountLabel}
          </button>
        </div>
      )}
    </header>
  );
}
