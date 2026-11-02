export const complimentaryOrderTypes = ["Free / giveaway", "Etsy", "eBay", "Amazon", "Other"] as const;

export function isEtsyOrder(order: { customer_details_json?: Record<string, unknown> | null }) {
  return order.customer_details_json?.complimentary_order_type === "Etsy";
}
