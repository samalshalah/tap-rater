export const FREE_SHIPPING_THRESHOLD_CENTS = 6000;
export const STANDARD_SHIPPING_CENTS = 1200;

export type CheckoutShippingRule = {
  mode: "manual" | "free" | "flat";
  amountCents: number;
  displayName: string;
};

export function resolveCheckoutShippingRule(
  subtotalCents: number,
  settings?: { shippingMode?: "manual" | "free" | "flat"; flatShippingAmountCents?: number; freeShippingThresholdCents?: number | null }
): CheckoutShippingRule {
  const normalizedSubtotal = Number.isFinite(subtotalCents) ? Math.max(0, Math.round(subtotalCents)) : 0;
  const shippingMode = settings?.shippingMode ?? "flat";

  if (shippingMode === "manual") {
    return {
      mode: "manual",
      amountCents: 0,
      displayName: "Shipping reviewed after order"
    };
  }

  if (shippingMode === "free") {
    return {
      mode: "free",
      amountCents: 0,
      displayName: "Free shipping"
    };
  }

  if (settings?.freeShippingThresholdCents !== null && normalizedSubtotal >= (settings?.freeShippingThresholdCents ?? FREE_SHIPPING_THRESHOLD_CENTS)) {
    return {
      mode: "free",
      amountCents: 0,
      displayName: "Free shipping"
    };
  }

  return {
    mode: "flat",
    amountCents: Number.isFinite(settings?.flatShippingAmountCents)
      ? Math.max(0, Math.round(settings?.flatShippingAmountCents ?? STANDARD_SHIPPING_CENTS))
      : STANDARD_SHIPPING_CENTS,
    displayName: "Standard shipping"
  };
}
