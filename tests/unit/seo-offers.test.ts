import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { productJsonLd } from "@/lib/seo";
import { defaultOffers, singleStandPrice } from "@/lib/offers";
import { getDefaultShippingSettings } from "@/lib/shipping-settings";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
const product = migratedProducts.find((p) => p.slug === "google-review-stand")!;
const schema = (
  offers = structuredClone(defaultOffers),
  shipping = getDefaultShippingSettings(),
) => productJsonLd(product, { offers, shipping }) as any;
describe("SEO offer accuracy", () => {
  it("uses eligible single-unit discounts without advertising bulk discounts", () => {
    expect(schema().hasVariant.map((v: any) => v.offers.price)).toEqual([
      "39.00",
      "46.00",
    ]);
    expect(
      schema().hasVariant[1].offers.shippingDetails[0].shippingRate.value,
    ).toBe("12.00");
  });
  it("respects exclusions, disabled and scheduled promotions", () => {
    const offers = structuredClone(defaultOffers);
    offers.excludedProducts = [product.slug];
    expect(schema(offers).hasVariant[1].offers.price).toBe("49.00");
    offers.excludedProducts = [];
    offers.upgrade.startsAt = "2035-01-01T00:00:00Z";
    expect(
      singleStandPrice(
        product.slug,
        "branded_qr_direct",
        4900,
        offers,
        Date.parse("2026-10-09"),
      ),
    ).toBe(4900);
    offers.enabled = false;
    expect(schema(offers).hasVariant[1].offers.price).toBe("49.00");
  });
  it("uses destination-specific shipping and never invents manually quoted rates", () => {
    const offers = structuredClone(defaultOffers);
    offers.shipping.thresholdCents = 4500;
    expect(
      schema(offers).hasVariant[1].offers.shippingDetails[0].shippingRate.value,
    ).toBe("0.00");
    expect(
      schema(offers).hasVariant[0].offers.shippingDetails[0].shippingRate.value,
    ).toBe("12.00");
    expect(
      schema(offers, {
        ...getDefaultShippingSettings(),
        shippingMode: "manual",
      }).hasVariant[0].offers.shippingDetails,
    ).toBeUndefined();
  });
  it("repairs legacy Standard QR promises without erasing merchant copy", () => {
    const edited = {
      ...product,
      purchaseOptions: product.purchaseOptions!.map((o) => ({
        ...o,
        description:
          o.optionCode === "standard_direct"
            ? "Ready-made Yelp Review with QR and NFC programmed to the link you provide."
            : o.description,
      })),
    };
    expect(getProductPurchaseOptions(edited)[0].summary).toContain(
      "Standard is NFC-only, with no printed QR",
    );
  });
});
