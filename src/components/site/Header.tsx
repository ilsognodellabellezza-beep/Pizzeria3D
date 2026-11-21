"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Phone, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { telHref } from "@/lib/site";
import { formatEuro } from "@/lib/pricing";
import { Logo } from "./Logo";
import { useSiteInfo } from "./SiteInfo";

const NAV = [
  { href: "/menu", label: "Menù" },
  { href: "/ordina", label: "Ordina" },
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/contatti", label: "Contatti" },
];

export function Header() {
  const pathname = usePathname();
  const { count, subtotal, bump, setDrawerOpen, hydrated } = useCart();
  const { settings } = useSiteInfo();
  const [scrolled, setScrolled] = useState(false);
  const transparent = pathname === "/" && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        transparent ? "bg-black/40" : "border-b border-brace/40 bg-black/95 shadow-lg shadow-black/30 backdrop-blur"
      }`}
    >
      {settings.announcement && (
        <div className="bg-oro px-4 py-1.5 text-center text-sm font-medium text-lava">{settings.announcement}</div>
      )}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" aria-label="Epic Pizza — home" className="min-w-0 shrink">
          <Logo light />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principale">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-oro" : "text-crema/85 hover:bg-white/5 hover:text-crema"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <a
            href={telHref(settings.phone)}
            className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-crema/90 hover:text-crema"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">{settings.phone}</span>
          </a>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative inline-flex h-11 items-center gap-2 rounded-full bg-brace px-4 text-sm font-semibold text-white shadow-md shadow-brace/30 transition hover:bg-brace-dark"
            aria-label={`Apri il carrello, ${count} prodotti`}
          >
            <ShoppingBag key={bump} className={`h-5 w-5 ${bump ? "animate-pop" : ""}`} aria-hidden="true" />
            <span className="hidden sm:inline">{hydrated && count > 0 ? formatEuro(subtotal) : "Carrello"}</span>
            {hydrated && count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-oro px-1 text-xs font-bold text-lava">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

    </header>
  );
}
