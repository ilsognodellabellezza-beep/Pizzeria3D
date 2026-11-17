/** Marchio: pizza vista dall'alto con una fetta tagliata */
export function PizzaMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#1c1a19" stroke="#d4a24c" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="16.5" fill="#d4a24c" />
      <circle cx="24" cy="24" r="13.2" fill="#c8412b" />
      <path d="M24 24 L24 10.8 A13.2 13.2 0 0 1 35.4 17.4 Z" fill="#f6f0e6" opacity=".92" />
      <circle cx="18" cy="20" r="2.1" fill="#a3321f" />
      <circle cx="19.5" cy="30" r="2.1" fill="#a3321f" />
      <circle cx="30.5" cy="29.5" r="2.1" fill="#a3321f" />
      <circle cx="31" cy="21" r="1.2" fill="#4e7a3a" />
      <circle cx="24.6" cy="16" r="1.2" fill="#4e7a3a" />
    </svg>
  );
}

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <PizzaMark className="h-9 w-9 shrink-0" />
      <span className="min-w-0 leading-none">
        <span className={`block whitespace-nowrap font-serif text-lg font-bold tracking-tight sm:text-xl ${light ? "text-crema" : "text-lava"}`}>
          Nati <span className="text-oro">x</span> la <span className="font-normal italic">Pizza</span>
        </span>
        {!compact && (
          <span className={`mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.2em] min-[400px]:block ${light ? "text-oro-light/80" : "text-pietra"}`}>
            Pizzeria · Hamburgheria · Catania
          </span>
        )}
      </span>
    </span>
  );
}
