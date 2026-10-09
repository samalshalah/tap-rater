import { ecommerceData, type AnalyticsItem, type PurchaseData } from "@/lib/storefront-analytics";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const cents = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

// Accept only persisted, paid live orders. Never use URL amounts, cart snapshots or the success redirect as proof.
export function verifiedPurchase(input: unknown): PurchaseData | null {
  const row = object(input);
  if (row.status !== "paid" || row.payment_status !== "paid" || row.refund_status || row.stripe_refund_id ||
    !/^cs_live_[A-Za-z0-9]+$/.test(String(row.stripe_checkout_session_id)) ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(row.id)) || String(row.currency).toLowerCase() !== "usd") return null;
  const tax = object(object(row.customer_details_json).tax_summary).amount_cents;
  if (!cents(tax) || !cents(row.shipping_amount_cents) || !cents(row.total_cents) || !Array.isArray(row.line_items_json) || !row.line_items_json.length) return null;
  const items: AnalyticsItem[] = [];
  for (const raw of row.line_items_json) {
    const item = object(raw);
    if (typeof item.productId !== "string" || !/^[a-z0-9-]{1,100}$/.test(item.productId) ||
      !["standard_direct", "branded_qr_direct", "hosted_multilink"].includes(String(item.optionId)) ||
      !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 99 || !cents(item.unitAmountCents) ||
      (!cents(item.discountCents ?? 0) || Number(item.discountCents ?? 0) > item.unitAmountCents * Number(item.quantity) || item.lineSubtotalCents !== item.unitAmountCents * Number(item.quantity) - Number(item.discountCents ?? 0))) return null;
    items.push({ item_id: item.productId, item_variant: String(item.optionId), price: Number(item.lineSubtotalCents) / Number(item.quantity) / 100, quantity: Number(item.quantity) });
    const setup = object(item.setup);
    if (setup.serviceMode === "HOSTED" && cents(setup.monthlyPriceCents) && setup.monthlyPriceCents > 0) {
      items.push({ item_id: "multi-link-monthly", item_variant: "subscription", price: setup.monthlyPriceCents / 100, quantity: Number(item.quantity) });
    }
  }
  const data = ecommerceData(items);
  if (Math.round(data.value * 100) + tax + row.shipping_amount_cents !== row.total_cents) return null;
  return { ...data, transaction_id: String(row.id), tax: tax / 100, shipping: row.shipping_amount_cents / 100 };
}
