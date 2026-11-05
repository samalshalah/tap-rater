import type { OrderLineItem, OrderRecord } from "@/lib/orders";

export function canCreateReplacement(source: OrderRecord) {
  return Boolean(source.id && source.email && source.line_items_json.length) && source.status === "paid" && !source.stripe_refund_id && !source.refund_status;
}

export function buildDamagedStandReplacement(source: OrderRecord, requestId: string): OrderRecord {
  if (!canCreateReplacement(source) || !source.id) {
    throw new Error("Choose a completed customer order with at least one stand to replace.");
  }
  const now = new Date().toISOString();
  const originalReference = source.stripe_checkout_session_id || source.id;
  const lines = source.line_items_json.map(copyReplacementLine);

  return {
    stripe_checkout_session_id: `replacement_${source.id}_${requestId}`,
    status: "paid",
    payment_status: "complimentary",
    email: source.email,
    customer_name: source.customer_name,
    subtotal_cents: 0,
    total_cents: 0,
    shipping_amount_cents: 0,
    currency: source.currency || "usd",
    shipping_mode: "free",
    shipping_method: "Replacement shipping",
    shipping_address_json: source.shipping_address_json ? structuredClone(source.shipping_address_json) : null,
    customer_details_json: {
      ...(source.customer_details_json ?? {}),
      source: "admin_replacement",
      complimentary_order_type: "Replacement",
      complimentary_reason: "Damaged in delivery",
      replacement_of_order_id: source.id,
      replacement_of_order_reference: originalReference
    },
    production_status: "ready_for_production",
    shipping_status: "not_shipped",
    shipping_carrier: null,
    tracking_number: null,
    tracking_url: null,
    shipped_at: null,
    internal_notes: `Replacement — damaged in delivery — original order ${originalReference}`,
    admin_fulfillment_notes: "",
    updated_at: now,
    line_items_json: lines
  };
}

function copyReplacementLine(item: OrderLineItem): OrderLineItem {
  const { standLineId: _standLineId, ...rest } = item;
  return {
    ...structuredClone(rest),
    unitAmountCents: 0,
    lineSubtotalCents: 0,
    discountCents: 0
  };
}
