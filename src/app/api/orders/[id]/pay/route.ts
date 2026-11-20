import { NextResponse } from "next/server";
import { getOrderWithItems } from "@/lib/orders";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";

/** Riprende il pagamento online di un ordine ancora «in attesa di pagamento» */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !isStripeConfigured()) return NextResponse.json({ error: "Non disponibile" }, { status: 400 });
  const order = await getOrderWithItems(id);
  if (!order || order.status !== "in_attesa_pagamento" || order.payment_method !== "online") {
    return NextResponse.json({ error: "Ordine non in attesa di pagamento" }, { status: 409 });
  }
  try {
    const url = await createCheckoutSession({ id: order.id, number: order.number, total: Number(order.total), email: order.customer_email });
    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Pagamento non disponibile al momento" }, { status: 502 });
  }
}
