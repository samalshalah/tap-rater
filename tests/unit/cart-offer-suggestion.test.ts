import { describe, expect, it } from "vitest";
import { defaultOffers, type OfferLine } from "@/lib/offers";
import { getCartOfferSuggestion } from "@/lib/cart-offer-suggestion";
const line: OfferLine = { productId: "google-review-stand", optionId: "standard_direct", quantity: 1, unitAmountCents: 3900 };
describe("cart offer suggestion", () => {
  it("quotes a second stand using checkout discounts", () => {
    expect(getCartOfferSuggestion([line], defaultOffers)).toMatchObject({ additionalCostCents: 3315, extraSavingsCents: 585 });
  });
  it("compares against the existing branded saving instead of stacking discounts", () => {
    expect(getCartOfferSuggestion([{ ...line, optionId: "branded_qr_direct", unitAmountCents: 4900 }], defaultOffers)).toMatchObject({ additionalCostCents: 4465, extraSavingsCents: 435 });
  });
  it("hides offers for excluded, recurring, empty, and disabled carts", () => {
    expect(getCartOfferSuggestion([], defaultOffers)).toBeNull();
    expect(getCartOfferSuggestion([line], { ...defaultOffers, enabled: false })).toBeNull();
    expect(getCartOfferSuggestion([line], { ...defaultOffers, excludedProducts: [line.productId] })).toBeNull();
    expect(getCartOfferSuggestion([{ ...line, recurring: true }], defaultOffers)).toBeNull();
  });
  it("does not promote an expired discount or a tier without extra savings", () => {
    const settings = { ...defaultOffers, second: { ...defaultOffers.second, endsAt: "2020-01-01T00:00:00Z" } };
    expect(getCartOfferSuggestion([line], settings)).toBeNull();
    expect(getCartOfferSuggestion([{ ...line, quantity: 3 }], defaultOffers)).toBeNull();
  });
});
