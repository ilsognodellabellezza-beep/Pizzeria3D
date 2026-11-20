import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";
import { getOrderWithItems, releaseDiscount } from "@/lib/orders";
import { getServiceSupabase } from "@/lib/supabase/server";
import { verifyWebhook } from "@/lib/stripe";

export const runtime = "nodejs";

type StripeEvent = {
  type: string;
  data: { object: { client_reference_id?: string | null; payment_status?: string; payment_intent?: string | null; metadata?: { order_id?: string } } };
};

export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }
  const event = JSON.parse(payload) as StripeEvent;
  const obj = event.data.object;
  const orderId = obj.client_reference_id || obj.metadata?.order_id;
  if (!orderId) return NextResponse.json({ received: true });
  const sb = getServiceSupabase();

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (obj.payment_status !== "paid") return NextResponse.json({ received: true });
    const { data } = await sb
      .from("orders")
      .update({ status: "nuovo", payment_status: "paid", stripe_payment_id: obj.payment_intent ?? null })
      .eq("id", orderId)
      .eq("status", "in_attesa_pagamento")
      .select("id");
    if (data?.length) {
      const order = await getOrderWithItems(orderId);
      if (order) await sendOrderConfirmation(order);
    }
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const { data } = await sb
      .from("orders")
      .update({ status: "annullato", payment_status: "failed", status_reason: "Pagamento online non completato" })
      .eq("id", orderId)
      .eq("status", "in_attesa_pagamento")
      .select("id");
    if (data?.length) await releaseDiscount(orderId);
  }
  return NextResponse.json({ received: true });
}
