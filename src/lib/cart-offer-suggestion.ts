import { quoteOffers, type OfferLine, type OffersSettings } from "@/lib/offers";

// Offer one concrete next step using the same non-stacking rules as checkout.
export function getCartOfferSuggestion(lines: OfferLine[], settings: OffersSettings, now = Date.now()) {
  if (!settings.enabled) return null;
  const eligible = lines.filter(line => !line.recurring && line.quantity > 0 &&
    ["standard_direct", "branded_qr_direct"].includes(line.optionId) &&
    !settings.excludedProducts.includes(line.productId));
  const quantity = eligible.reduce((sum, line) => sum + line.quantity, 0);
  if (![1, 2, 4].includes(quantity)) return null;
  const current = quoteOffers(lines, settings, now);
  for (const line of eligible) {
    const next = quoteOffers([...lines, { ...line, quantity: 1 }], settings, now);
    const extraSavingsCents = next.discountCents - current.discountCents;
    if (extraSavingsCents > 0) return {
      productId: line.productId,
      optionId: line.optionId,
      extraSavingsCents,
      additionalCostCents: next.subtotalCents - current.subtotalCents,
    };
  }
  return null;
}
