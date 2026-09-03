export const FREE_SHIPPING_THRESHOLD_CENTS = 5500;
export const STANDARD_SHIPPING_CENTS = 1200;

export type CheckoutShippingRule = {
  mode: "free" | "flat";
  amountCents: number;
  displayName: string;
};

export function resolveCheckoutShippingRule(subtotalCents: number): CheckoutShippingRule {
  const normalizedSubtotal = Number.isFinite(subtotalCents) ? Math.max(0, Math.round(subtotalCents)) : 0;

  if (normalizedSubtotal >= FREE_SHIPPING_THRESHOLD_CENTS) {
    return {
      mode: "free",
      amountCents: 0,
      displayName: "Free shipping"
    };
  }

  return {
    mode: "flat",
    amountCents: STANDARD_SHIPPING_CENTS,
    displayName: "Standard shipping"
  };
}
