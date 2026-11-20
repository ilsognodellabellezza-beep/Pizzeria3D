import { CalendarDays, Tag } from "lucide-react";
import { formatDate } from "@/lib/time";
import type { ActivePromotion } from "@/lib/types";

/** Sezione promozioni della home: non viene mostrata se nessuna promozione è in corso oggi. */
export function PromoSection({ promotions }: { promotions: ActivePromotion[] }) {
  if (promotions.length === 0) return null;
  return (
    <section className="bg-epic-texture py-16 text-white" aria-labelledby="promozioni">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-oro-light">Offerte del momento</p>
        <h2 id="promozioni" className="mt-2 font-serif text-4xl font-bold">Promozioni</h2>
        <ul className={`mt-8 grid gap-5 ${promotions.length > 1 ? "md:grid-cols-2" : "max-w-2xl"}`}>
          {promotions.map((p) => (
            <li key={p.id} className="rounded-3xl bg-white p-6 text-lava shadow-xl shadow-black/20">
              <h3 className="font-serif text-2xl font-bold text-brace-dark">{p.title}</h3>
              {p.description && <p className="mt-2 text-pietra">{p.description}</p>}
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-pietra">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Dal {formatDate(p.starts_on)} al {formatDate(p.ends_on)}
              </p>
              {p.visible_code && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-oro/20 px-4 py-2 text-sm">
                  <Tag className="h-4 w-4 text-oro-dark" aria-hidden="true" />
                  Codice sconto: <strong className="font-mono text-base tracking-wider">{p.visible_code.code}</strong>
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
