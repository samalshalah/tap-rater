import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { defaultOffers, offersSchema, type OffersSettings } from "@/lib/offers";
import { analyticsSql } from "@/lib/storefront-analytics-server";

export async function getOfferUsage() {
  return analyticsSql().query(
    `SELECT item->>'offerLabel' label,count(DISTINCT o.id)::int orders,
    sum((item->>'discountCents')::bigint)::bigint savings,
    sum((item->>'lineSubtotalCents')::bigint)::bigint merchandise
    FROM orders o CROSS JOIN LATERAL jsonb_array_elements(o.line_items_json) item
    LEFT JOIN storefront_analytics_checkouts c ON c.stripe_session_id=o.stripe_checkout_session_id
    WHERE o.stripe_checkout_session_id LIKE 'cs_live_%' AND o.payment_status='paid' AND o.status='paid'
    AND NOT coalesce(c.excluded,false) AND item->>'offerId' IS NOT NULL
    GROUP BY item->>'offerLabel' ORDER BY orders DESC`,
    [],
  );
}

export async function getOffersSettings(): Promise<OffersSettings> {
  noStore();
  if (!hasSupabaseAdminConfig()) return defaultOffers;
  const { data, error } = await getSupabaseAdmin()
    .from("site_content")
    .select("payload")
    .eq("key", "automatic_offers")
    .maybeSingle();
  if (error) throw new Error("Offers could not be loaded. Please retry.");
  return data ? offersSchema.parse(data.payload) : defaultOffers;
}
export async function saveOffersSettings(value: OffersSettings) {
  const { error } = await getSupabaseAdmin()
    .from("site_content")
    .upsert({
      key: "automatic_offers",
      type: "section",
      status: "published",
      payload: offersSchema.parse(value),
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error("Offers could not be saved.");
}
