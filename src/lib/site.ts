/** Valore di una variabile d'ambiente senza spazi e virgolette esterne ("" se assente) */
export function cleanEnv(value: string | undefined): string {
  return (value ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

/**
 * Normalizza un URL inserito a mano nelle variabili d'ambiente (es. su Vercel):
 * "pizzeria.vercel.app" o "https://xyz.supabase.co/rest/v1/" diventano "https://…" senza percorso.
 * Un valore non valido rompeva la build ("Invalid URL").
 */
export function normalizeOrigin(value: string | undefined, fallback: string): string {
  const raw = cleanEnv(value);
  if (!raw) return fallback;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).origin;
  } catch {
    return fallback;
  }
}

// Dati statici del locale. I recapiti modificabili (telefono, email…) stanno nella tabella `settings`.
export const SITE = {
  name: "Nati x la Pizza",
  fullName: "Nati x la Pizza – Pizzeria e Hamburgheria a Catania",
  claim: "Impasto leggero, anima catanese.",
  description:
    "Pizzeria a Catania, zona Cibali: pizze normali e maxi, pizzoli, pinse, calzoni, smash burger e pan panini. Ordina online per asporto o consegna a domicilio.",
  url: normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL, "https://natixlapizza.it"),
  address: {
    street: "Via Sabato Martelli Castaldi 92",
    cap: "95123",
    city: "Catania",
    province: "CT",
    region: "Sicilia",
    country: "IT",
  },
  geo: { lat: 37.51361, lng: 15.06676 },
  // Da compilare quando disponibili (se null non vengono mostrati)
  instagram: null as string | null,
  instagramHandle: null as string | null,
  facebook: null as string | null,
  rating: null as { value: number; count: number } | null,
  priceRange: "€",
  googleMapsUrl: "https://maps.app.goo.gl/52YQKhUe1DDRYFkW8",
};

export const fullAddress = `${SITE.address.street}, ${SITE.address.cap} ${SITE.address.city} (${SITE.address.province})`;

export function telHref(phone: string | null | undefined): string {
  return `tel:${(phone ?? "").replace(/[^+\d]/g, "")}`;
}

export function whatsappHref(number: string | null | undefined, text?: string): string {
  const n = (number ?? "").replace(/\D/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
