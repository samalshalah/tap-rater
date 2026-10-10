import { usDeliveryEstimate } from "@/lib/delivery-estimates";

export type CustomerReviewOrder = {
  merchant_id: number;
  order_id: string;
  email: string;
  delivery_country: string;
  estimated_delivery_date: string;
};

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function customerReviewOrder(input: unknown, now = new Date()): CustomerReviewOrder | null {
  const row = object(input);
  if (row.status !== "paid" || row.payment_status !== "paid" || row.refund_status || row.stripe_refund_id ||
    !/^cs_live_[A-Za-z0-9]+$/.test(String(row.stripe_checkout_session_id)) ||
    !/^[a-f0-9-]{36}$/i.test(String(row.id)) || typeof row.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return null;
  const address = object(object(row.shipping_address_json).address);
  if (address.country !== "US") return null;
  // Use the current confirmation date, not the possibly much older unpaid-cart creation date.
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const date = new Date(`${localDate}T12:00:00Z`);
  let days = usDeliveryEstimate.structuredData.handlingTime.maxValue + usDeliveryEstimate.structuredData.transitTime.maxValue;
  while (days > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) days--;
  }
  return { merchant_id: 5872950011, order_id: String(row.id), email: row.email, delivery_country: "US", estimated_delivery_date: date.toISOString().slice(0, 10) };
}
