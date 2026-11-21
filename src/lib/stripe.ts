import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cleanEnv, SITE } from "./site";

/** Pagamento online con Stripe Checkout, via API REST (nessun SDK). Richiede STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET. */
const secretKey = () => cleanEnv(process.env.STRIPE_SECRET_KEY);
export const isStripeConfigured = () => Boolean(secretKey()) && Boolean(cleanEnv(process.env.STRIPE_WEBHOOK_SECRET));

export async function createCheckoutSession(order: { id: string; number: number; total: number; email: string | null }): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("Stripe non configurato");
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${SITE.url}/ordine/${order.id}?nuovo=1`,
    cancel_url: `${SITE.url}/ordine/${order.id}?pagamento=annullato`,
    client_reference_id: order.id,
    "metadata[order_id]": order.id,
    "payment_intent_data[metadata][order_id]": order.id,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(Math.round(order.total * 100)),
    "line_items[0][price_data][product_data][name]": `Ordine n° ${order.number} – ${SITE.name}`,
    // la sessione scade dopo ~35 minuti (minimo Stripe: 30): poi l'ordine viene annullato dal webhook
    expires_at: String(Math.floor(Date.now() / 1000) + 35 * 60),
    locale: "it",
  });
  if (order.email) body.set("customer_email", order.email);
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `order-${order.id}-${Date.now()}` },
    body,
  });
  const json = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !json.url) throw new Error(json.error?.message ?? "Errore Stripe");
  return json.url;
}

/** Verifica la firma del webhook (header Stripe-Signature) con tolleranza di 5 minuti */
export function verifyWebhook(payload: string, header: string | null): boolean {
  const secret = cleanEnv(process.env.STRIPE_WEBHOOK_SECRET);
  if (!secret || !header) return false;
  const items = header.split(",").map((p) => p.trim());
  const t = items.find((p) => p.startsWith("t="))?.slice(2);
  const sigs = items.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || sigs.length === 0 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return sigs.some((s) => {
    const buf = Buffer.from(s, "hex");
    return buf.length === expected.length && timingSafeEqual(buf, expected);
  });
}
