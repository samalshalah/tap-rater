import { afterEach, describe, expect, it } from "vitest";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { getProductPurchaseOptions, hasBrandedDirectProductionTemplate, isHostedPurchaseOptionEnabled } from "@/lib/purchase-options";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";

describe("purchase option readiness", () => {
  afterEach(() => {
    delete process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING;
  });

  it("offers only Standard Direct when a direct product has no branded production template", () => {
    const product = migratedProducts.find((item) => item.slug === "google-review-stand");

    expect(product).toBeDefined();
    expect(getProductPurchaseOptions({ ...product!, assetSet: {} }).map((option) => option.id)).toEqual(["standard_direct"]);
  });

  it("offers Branded Direct when the front template is configured and center asset is null", () => {
    const product = {
      ...migratedProducts.find((item) => item.slug === "google-review-stand")!,
      assetSet: {
        brandedFrontTemplateUrl: "/uploads/templates/google-branded-front.png"
      }
    } satisfies MigratedProduct;

    expect(hasBrandedDirectProductionTemplate(product)).toBe(true);
    expect(getProductPurchaseOptions(product).map((option) => option.id)).toEqual(["standard_direct", "branded_qr_direct"]);
  });

  it("does not offer Branded Direct when only a center asset is configured", () => {
    const product = {
      ...migratedProducts.find((item) => item.slug === "google-review-stand")!,
      assetSet: {
        centerAssetUrl: "/uploads/center/google.svg"
      }
    } satisfies MigratedProduct;

    expect(hasBrandedDirectProductionTemplate(product)).toBe(false);
    expect(getProductPurchaseOptions(product).map((option) => option.id)).toEqual(["standard_direct"]);
  });

  it("keeps Multi-Link out of physical purchase options", () => {
    const product = migratedProducts.find((item) => item.slug === "rate-your-experience-stand")!;

    expect(isHostedPurchaseOptionEnabled()).toBe(false);
    expect(productSupportsMultiLink(product)).toBe(true);
    expect(getProductPurchaseOptions(product).map((option) => option.id)).not.toContain("hosted_multilink");
  });

  it("models Multi-Link as a reusable $9.99 monthly service add-on", () => {
    expect(hostedMultiLinkServiceAddon).toMatchObject({
      code: "hosted_multilink",
      title: "Multi-Link",
      monthlyPriceCents: 999,
      maxLinks: 10,
      requiresAccount: true,
      requiresHostedPage: true,
      active: true
    });
  });

  it("uses explicit product compatibility for Multi-Link", () => {
    expect(productSupportsMultiLink(migratedProducts.find((item) => item.slug === "google-review-stand")!)).toBe(false);
    expect(productSupportsMultiLink(migratedProducts.find((item) => item.slug === "yelp-review-stand")!)).toBe(false);
    expect(productSupportsMultiLink(migratedProducts.find((item) => item.slug === "follow-us-social-media-stand")!)).toBe(true);
    expect(productSupportsMultiLink(migratedProducts.find((item) => item.slug === "rate-your-experience-stand")!)).toBe(true);
    expect(productSupportsMultiLink(migratedProducts.find((item) => item.slug === "custom-direct-stand")!)).toBe(true);
  });
});
