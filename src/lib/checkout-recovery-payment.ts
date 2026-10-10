import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import type { OrderRecord } from "@/lib/orders";

export function buildRecoverySessionParams(order: OrderRecord, token: string): Stripe.Checkout.SessionCreateParams {
  const lines: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let recurring = 0;
  if (order.currency !== "usd" || !order.shipping_address_json) throw new Error("Support must review currency and shipping address before requesting payment.");
  if (!order.line_items_json.length) throw new Error("The saved order has no products.");
  for (const item of order.line_items_json) {
    if (!Number.isSafeInteger(item.lineSubtotalCents) || item.lineSubtotalCents < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error("Saved order pricing needs review.");
    const base = Math.floor(item.lineSubtotalCents / item.quantity), remainder = item.lineSubtotalCents % item.quantity;
    const product_data = { name: item.title, description: item.optionLabel || "Tap Rater stand", metadata: { product_id: item.productId, sku: item.sku, option_id: item.optionId || "" } };
    if (item.quantity > remainder) lines.push({ quantity: item.quantity - remainder, price_data: { currency: "usd", unit_amount: base, product_data } });
    if (remainder) lines.push({ quantity: remainder, price_data: { currency: "usd", unit_amount: base + 1, product_data } });
    if (item.destinationMode === "HOSTED") {
      const monthly = item.monthlyAmountCents;
      if (typeof monthly !== "number" || !Number.isSafeInteger(monthly) || monthly <= 0) throw new Error("The saved subscription price needs support review.");
      if (!order.stripe_checkout_session_id.startsWith("cs_live_")) throw new Error("Legacy Multi-Link subscriptions require a new reviewed checkout.");
      recurring += monthly * item.quantity;
      lines.push({ quantity: item.quantity, price_data: { currency: "usd", unit_amount: monthly, recurring: { interval: "month" }, product_data: { ...product_data, name: `${item.title} monthly hosting` } } });
    }
  }
  if (order.line_items_json.reduce((sum, item) => sum + item.lineSubtotalCents, 0) !== order.subtotal_cents) throw new Error("Saved order totals need review.");
  const tax = order.total_cents - order.subtotal_cents - order.shipping_amount_cents - recurring;
  if (!Number.isSafeInteger(tax) || tax < 0 || order.shipping_amount_cents < 0) throw new Error("Saved order totals need review.");
  for (const [name, amount] of [["Shipping", order.shipping_amount_cents], ["Tax", tax]] as const) {
    if (amount) lines.push({ quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name } } });
  }
  return {
    mode: recurring ? "subscription" : "payment", ui_mode: "hosted",
    integration_identifier: `taprater_recovery_${randomUUID().replaceAll("-", "").slice(0, 8)}`,
    customer_email: order.email!, line_items: lines,
    success_url: "https://taprater.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: `https://taprater.com/checkout/recover?token=${encodeURIComponent(token)}`,
    ...(recurring ? { subscription_data: { metadata: { tap_rater: "hosted_multilink" } } } : { customer_creation: "always", invoice_creation: { enabled: true } }),
    metadata: { recovery_original_order_id: order.id!, total_cents: String(order.subtotal_cents), recurring_total_cents: String(recurring),
      shipping_amount_cents: String(order.shipping_amount_cents), shipping_mode: order.shipping_mode || "flat", tax_amount_cents: String(tax),
      tax_mode: "manual", tax_label: "Tax", stripe_mode: "live", customer_name: order.customer_name || "" },
  };
}
