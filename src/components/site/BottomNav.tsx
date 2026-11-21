"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Phone, Pizza, UtensilsCrossed, User } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { telHref } from "@/lib/site";
import { useSiteInfo } from "./SiteInfo";

/** Barra di navigazione fissa in basso, solo su telefono/tablet (il sito è pensato per il mobile) */
export function BottomNav() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();
  const { settings } = useSiteInfo();
  if (pathname.startsWith("/checkout") || pathname.startsWith("/ordine/")) return null;

  const item = (href: string, label: string, Icon: typeof Home) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 text-[11px] font-medium ${active ? "text-brace" : "text-crema/70"}`}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
        {label}
      </Link>
    );
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brace/30 bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Navigazione rapida"
    >
      <div className="mx-auto flex h-16 max-w-xl items-stretch">
        {item("/", "Home", Home)}
        {item("/menu", "Menù", UtensilsCrossed)}
        <Link href="/ordina" className="relative flex flex-1 flex-col items-center justify-end pb-1.5 text-[11px] font-semibold text-white" aria-label="Ordina ora">
          <span className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-brace shadow-[0_0_22px_rgb(237_28_36/0.65)] ring-4 ring-black">
            <Pizza className="h-6 w-6" aria-hidden="true" />
            {hydrated && count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-oro px-1 text-xs font-bold text-lava">{count}</span>
            )}
          </span>
          Ordina
        </Link>
        {item("/area-cliente", "Accedi", User)}
        <a href={telHref(settings.phone)} className="flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 text-[11px] font-medium text-crema/70">
          <Phone className="h-6 w-6" aria-hidden="true" />
          Chiama
        </a>
      </div>
    </nav>
  );
}
