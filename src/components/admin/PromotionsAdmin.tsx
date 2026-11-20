"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteDiscount, deletePromotion, saveDiscount, savePromotion, setDiscountVisible } from "@/app/admin/actions";
import { formatEuro } from "@/lib/pricing";
import { formatDate, formatDateTime, romeDateKey } from "@/lib/time";
import type { DiscountCode, Promotion } from "@/lib/types";
import { adminInput, Card, PrimaryButton, SecondaryButton, Toggle } from "./ui";

type Result = { ok: boolean; error?: string };

function promoState(p: Promotion, today: string): { label: string; cls: string } {
  if (!p.is_active) return { label: "Disattivata", cls: "bg-lava/10 text-pietra" };
  if (today < p.starts_on) return { label: `Parte il ${formatDate(p.starts_on)}`, cls: "bg-oro/20 text-oro-dark" };
  if (today > p.ends_on) return { label: "Terminata", cls: "bg-lava/10 text-pietra" };
  return { label: "In corso (visibile sul sito)", cls: "bg-basilico/15 text-basilico" };
}

export function PromotionsAdmin({ codes, promotions }: { codes: DiscountCode[]; promotions: Promotion[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = romeDateKey(new Date());
  const [f, setF] = useState({ code: "", type: "percent" as "percent" | "fixed", value: "10", min_order: "0", starts_at: "", expires_at: "", max_uses: "", is_visible: false });
  const [p, setP] = useState({ title: "", description: "", starts_on: today, ends_on: today, discount_code: "" });

  const exec = (fn: () => Promise<Result>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Errore");
      else {
        after?.();
        router.refresh();
      }
    });

  const createPromo = () =>
    exec(
      () => savePromotion({ title: p.title, description: p.description || null, starts_on: p.starts_on, ends_on: p.ends_on, discount_code: p.discount_code || null, is_active: true }),
      () => setP({ title: "", description: "", starts_on: today, ends_on: today, discount_code: "" }),
    );

  const togglePromo = (x: Promotion) =>
    exec(() => savePromotion({ id: x.id, title: x.title, description: x.description, starts_on: x.starts_on, ends_on: x.ends_on, discount_code: x.discount_code, is_active: !x.is_active }));

  const create = () =>
    exec(
      () =>
        saveDiscount({
          code: f.code,
          type: f.type,
          value: Number(f.value.replace(",", ".")),
          min_order: Number(f.min_order.replace(",", ".")) || 0,
          starts_at: f.starts_at || null,
          expires_at: f.expires_at || null,
          max_uses: f.max_uses ? Number(f.max_uses) : null,
          is_active: true,
          is_visible: f.is_visible,
        }),
      () => setF({ ...f, code: "" }),
    );

  const toggle = (c: DiscountCode) =>
    exec(() => saveDiscount({ code: c.code, type: c.type, value: Number(c.value), min_order: Number(c.min_order), starts_at: c.starts_at, expires_at: c.expires_at, max_uses: c.max_uses, is_active: !c.is_active, is_visible: c.is_visible }));

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl font-bold">Promozioni</h1>
      {error && <p className="rounded-2xl bg-brace p-3 text-sm font-semibold text-white" role="alert">{error}</p>}

      <Card title="Promozioni sul sito">
        <p className="mb-4 text-sm text-pietra">
          Una promozione compare nella home dal primo all&apos;ultimo giorno indicato, in automatico. Quando non ce ne sono in corso, la sezione sul sito non si vede.
          Se la colleghi a un codice sconto, anche il codice vale solo in quelle date.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Titolo<input className={`${adminInput} mt-1`} value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} placeholder="Es. Weekend 2 pizze + bibita" /></label>
          <label className="text-sm font-medium sm:col-span-2">Descrizione<textarea rows={2} className={`${adminInput} mt-1 h-auto py-2`} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></label>
          <label className="text-sm font-medium">Data di inizio<input type="date" className={`${adminInput} mt-1`} value={p.starts_on} onChange={(e) => setP({ ...p, starts_on: e.target.value, ends_on: p.ends_on < e.target.value ? e.target.value : p.ends_on })} /></label>
          <label className="text-sm font-medium">Data di fine (inclusa)<input type="date" min={p.starts_on} className={`${adminInput} mt-1`} value={p.ends_on} onChange={(e) => setP({ ...p, ends_on: e.target.value })} /></label>
          <label className="text-sm font-medium sm:col-span-2">
            Codice sconto collegato (facoltativo)
            <select className={`${adminInput} mt-1`} value={p.discount_code} onChange={(e) => setP({ ...p, discount_code: e.target.value })}>
              <option value="">Nessuno</option>
              {codes.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </label>
        </div>
        <PrimaryButton className="mt-4" disabled={p.title.trim().length < 2 || !p.starts_on || !p.ends_on} onClick={createPromo}>Crea promozione</PrimaryButton>

        <ul className="mt-5 divide-y divide-lava/5">
          {promotions.map((x) => {
            const st = promoState(x, today);
            return (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{x.title}</p>
                  <p className="text-sm text-pietra">
                    {formatDate(x.starts_on)} → {formatDate(x.ends_on)}{x.discount_code ? ` · codice ${x.discount_code}` : ""}
                  </p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle checked={x.is_active} onChange={() => togglePromo(x)} label="Attiva" />
                  <button type="button" onClick={() => confirm(`Eliminare "${x.title}"?`) && exec(() => deletePromotion(x.id))} className="flex h-10 w-10 items-center justify-center text-brace" aria-label={`Elimina ${x.title}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
          {promotions.length === 0 && <li className="py-4 text-pietra">Nessuna promozione: sul sito la sezione non è visibile.</li>}
        </ul>
      </Card>

      <Card title="Nuovo codice sconto">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">Codice<input className={`${adminInput} mt-1 uppercase`} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="ESTATE10" /></label>
          <label className="text-sm font-medium">
            Tipo
            <select className={`${adminInput} mt-1`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as "percent" | "fixed" })}>
              <option value="percent">Percentuale %</option>
              <option value="fixed">Importo fisso €</option>
            </select>
          </label>
          <label className="text-sm font-medium">Valore<input inputMode="decimal" className={`${adminInput} mt-1`} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></label>
          <label className="text-sm font-medium">Ordine minimo €<input inputMode="decimal" className={`${adminInput} mt-1`} value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} /></label>
          <label className="text-sm font-medium">Valido dal<input type="datetime-local" className={`${adminInput} mt-1`} value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></label>
          <label className="text-sm font-medium">Scade il<input type="datetime-local" className={`${adminInput} mt-1`} value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></label>
          <label className="text-sm font-medium">Utilizzi massimi<input inputMode="numeric" className={`${adminInput} mt-1`} value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value.replace(/\D/g, "") })} placeholder="illimitati" /></label>
        </div>
        <div className="mt-3"><Toggle checked={f.is_visible} onChange={(v) => setF({ ...f, is_visible: v })} label="Mostra il codice sul sito (nella promozione collegata)" /></div>
        <PrimaryButton className="mt-4" disabled={f.code.length < 3} onClick={create}>Crea codice</PrimaryButton>
      </Card>

      <Card title="Codici">
        <ul className="divide-y divide-lava/5">
          {codes.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-mono text-lg font-bold">{c.code}</p>
                <p className="text-sm text-pietra">
                  {c.type === "percent" ? `-${Number(c.value)}%` : `-${formatEuro(Number(c.value))}`} · min {formatEuro(Number(c.min_order))} · usato {c.used}
                  {c.max_uses ? `/${c.max_uses}` : ""} volte{c.starts_at ? ` · dal ${formatDateTime(c.starts_at)}` : ""}{c.expires_at ? ` · scade ${formatDateTime(c.expires_at)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SecondaryButton
                  aria-pressed={c.is_visible}
                  onClick={() => exec(() => setDiscountVisible(c.code, !c.is_visible))}
                  className={c.is_visible ? "bg-basilico/10 text-basilico" : ""}
                >
                  {c.is_visible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                  {c.is_visible ? "Visibile sul sito" : "Nascosto"}
                </SecondaryButton>
                <Toggle checked={c.is_active} onChange={() => toggle(c)} label={c.is_active ? "Attivo" : "Disattivo"} />
                <button type="button" onClick={() => confirm(`Eliminare ${c.code}?`) && exec(() => deleteDiscount(c.code))} className="flex h-10 w-10 items-center justify-center text-brace" aria-label={`Elimina ${c.code}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
          {codes.length === 0 && <li className="py-4 text-pietra">Nessun codice.</li>}
        </ul>
      </Card>
    </div>
  );
}
