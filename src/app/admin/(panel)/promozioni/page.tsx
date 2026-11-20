import type { Metadata } from "next";
import { PromotionsAdmin } from "@/components/admin/PromotionsAdmin";
import { requireStaffPage } from "@/lib/auth";
import type { DiscountCode, Promotion } from "@/lib/types";

export const metadata: Metadata = { title: "Promozioni" };

export default async function PromotionsPage() {
  const { sb } = await requireStaffPage(true);
  const [codes, promos] = await Promise.all([
    sb.from("discount_codes").select("*").order("created_at", { ascending: false }),
    sb.from("promotions").select("*").order("starts_on", { ascending: false }),
  ]);
  return <PromotionsAdmin codes={(codes.data ?? []) as DiscountCode[]} promotions={(promos.data ?? []) as Promotion[]} />;
}
