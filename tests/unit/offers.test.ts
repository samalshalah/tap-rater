import { describe, expect, it } from "vitest";
import {
  defaultOffers,
  offerShippingSettings,
  offersSchema,
  quoteOffers,
} from "@/lib/offers";
import { resolveCheckoutShippingRule } from "@/lib/shipping-rules";
import { verifiedPurchase } from "@/lib/analytics-purchase";
import {
  buildStripeCheckoutLineItems,
  type CheckoutCartRow,
} from "@/lib/checkout";
const standard = (quantity = 1) => ({
  productId: "google-review-stand",
  optionId: "standard_direct",
  quantity,
  unitAmountCents: 3900,
});
const branded = (quantity = 1) => ({
  ...standard(quantity),
  optionId: "branded_qr_direct",
  unitAmountCents: 4900,
});
describe("automatic offers", () => {
  it("reports discounted purchase revenue to analytics and rejects inconsistent savings", () => {
    const item = { ...standard(2), discountCents: 585, lineSubtotalCents: 7215 };
    const order = { id: "12345678-1234-4123-8123-123456789abc", status: "paid", payment_status: "paid", stripe_checkout_session_id: "cs_live_example", currency: "usd", total_cents: 7648, shipping_amount_cents: 0, customer_details_json: { tax_summary: { amount_cents: 433 } }, line_items_json: [item] };
    expect(verifiedPurchase(order)?.value).toBe(72.15);
    expect(verifiedPurchase({ ...order, line_items_json: [{ ...item, discountCents: 600 }] })).toBeNull();
  });
  it("discounts one lower-priced stand across products", () => {
    const quote = quoteOffers(
      [standard(), { ...branded(), productId: "yelp-review-stand" }],
      defaultOffers,
    );
    expect(quote.subtotalCents).toBe(8215);
    expect(quote.lineDiscounts).toEqual([585, 0]);
  });
  it.each([
    [3, 10500, 13200],
    [5, 16600, 20800],
  ])("charges exact %i-stand bundle totals", (n, std, brd) => {
    expect(quoteOffers([standard(n)], defaultOffers).subtotalCents).toBe(std);
    expect(quoteOffers([branded(n)], defaultOffers).subtotalCents).toBe(brd);
  });
  it("combines per-design bundle rates without stacking upgrade savings", () => {
    const result = quoteOffers([standard(2), branded()], defaultOffers);
    expect(result.subtotalCents).toBe(11400);
    expect(result.offerId).toBe("bundle3");
  });
  it("applies the upgrade offer alone and chooses the best candidate", () => {
    expect(quoteOffers([branded()], defaultOffers).subtotalCents).toBe(4600);
    expect(quoteOffers([branded(2)], defaultOffers).discountCents).toBe(735);
  });
  it("respects exclusions, hosted products, disabled offers and schedules", () => {
    expect(
      quoteOffers([{ ...branded(5), recurring: true }], defaultOffers)
        .discountCents,
    ).toBe(0);
    expect(
      quoteOffers([standard(5)], {
        ...defaultOffers,
        excludedProducts: ["google-review-stand"],
      }).discountCents,
    ).toBe(0);
    expect(
      quoteOffers([standard(5)], { ...defaultOffers, enabled: false })
        .discountCents,
    ).toBe(0);
    const settings = structuredClone(defaultOffers);
    settings.upgrade.startsAt = "2030-01-01T00:00:00.000Z";
    expect(
      quoteOffers([branded()], settings, Date.parse("2026-10-09"))
        .discountCents,
    ).toBe(0);
    settings.upgrade.endsAt = "2029-01-01T00:00:00.000Z";
    expect(offersSchema.safeParse(settings).success).toBe(false);
  });
  it("uses the configurable after-discount shipping threshold and country restrictions", () => {
    const shipping = offerShippingSettings(
      { shippingMode: "flat" as const },
      defaultOffers,
    );
    expect(resolveCheckoutShippingRule(5999, shipping).amountCents).toBe(1200);
    expect(resolveCheckoutShippingRule(6000, shipping).amountCents).toBe(0);
    expect(
      resolveCheckoutShippingRule(
        10000,
        offerShippingSettings({ shippingMode: "flat" }, defaultOffers, "CA"),
      ).amountCents,
    ).toBe(1200);
    const result = quoteOffers(
      [{ ...branded(), unitAmountCents: 6100 }],
      defaultOffers,
    );
    expect(
      resolveCheckoutShippingRule(result.subtotalCents, shipping).amountCents,
    ).toBe(1200);
  });
  it("allocates odd cents exactly in Stripe without changing fulfillment rows", () => {
    const quote = quoteOffers([standard(2)], defaultOffers);
    const row = {
      ...standard(2),
      title: "Stand",
      optionLabel: "Standard",
      shortDescription: "Stand",
      sku: "STD",
      destinationMode: "DIRECT",
      lineSubtotalCents: quote.subtotalCents,
    } as CheckoutCartRow;
    const stripe = buildStripeCheckoutLineItems([row], 0, 433);
    expect(
      stripe.reduce(
        (sum, item) =>
          sum + (item.quantity || 0) * Number(item.price_data?.unit_amount),
        0,
      ),
    ).toBe(quote.subtotalCents + 433);
    expect(
      stripe.slice(0, 2).reduce((sum, item) => sum + (item.quantity || 0), 0),
    ).toBe(2);
    expect(row.quantity).toBe(2);
  });
});
