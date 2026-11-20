import Image from "next/image";

/** Logo Epic Pizza (timbro rosso con scritta bianca, sfondo trasparente) */
export function EpicLogo({ className = "h-14 w-14", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo-epic-pizza.png"
      alt="Epic Pizza"
      width={1000}
      height={1004}
      sizes="(max-width: 640px) 64px, 224px"
      priority={priority}
      className={`${className} shrink-0 object-contain`}
    />
  );
}

export function Logo({ compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <EpicLogo className={compact ? "h-11 w-11" : "h-14 w-14"} priority />
      {!compact && (
        <span className="hidden text-[11px] font-medium uppercase leading-tight tracking-[0.2em] text-oro-light/80 min-[420px]:block">
          Pizzeria · Hamburgheria<br />Catania
        </span>
      )}
    </span>
  );
}
