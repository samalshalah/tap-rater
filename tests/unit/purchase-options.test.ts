import { describe, expect, it } from "vitest";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { getProductPurchaseOptions, hasBrandedDirectProductionTemplate } from "@/lib/purchase-options";

describe("purchase option readiness", () => {
  it("offers only Standard Direct when a direct product has no branded production template", () => {
    const product = migratedProducts.find((item) => item.slug === "google-review-stand");

    expect(product).toBeDefined();
    expect(getProductPurchaseOptions(product!).map((option) => option.id)).toEqual(["standard_direct"]);
  });

  it("does not offer Branded Direct when only the base production template is configured", () => {
    const product = {
      ...migratedProducts.find((item) => item.slug === "google-review-stand")!,
      assetSet: {
        brandedFrontTemplateUrl: "/uploads/templates/google-branded-front.png"
      }
    } satisfies MigratedProduct;

    expect(hasBrandedDirectProductionTemplate(product)).toBe(false);
    expect(getProductPurchaseOptions(product).map((option) => option.id)).toEqual(["standard_direct"]);
  });

  it("offers Branded Direct only when base template and center asset are configured", () => {
    const product = {
      ...migratedProducts.find((item) => item.slug === "google-review-stand")!,
      assetSet: {
        brandedFrontTemplateUrl: "/uploads/templates/google-branded-front.png",
        centerAssetUrl: "/uploads/center/google.svg"
      }
    } satisfies MigratedProduct;

    expect(hasBrandedDirectProductionTemplate(product)).toBe(true);
    expect(getProductPurchaseOptions(product).map((option) => option.id)).toEqual(["standard_direct", "branded_qr_direct"]);
  });

  it("keeps HOSTED subscription checkout structurally available outside the public storefront filter", () => {
    const product = {
      ...migratedProducts.find((item) => item.slug === "rate-your-experience-stand")!,
      productKind: "hosted_multilink",
      requiresLandingPage: true,
      requiresSubscription: true,
      checkoutMode: "subscription",
      requiresAccount: true
    } satisfies MigratedProduct;

    expect(getProductPurchaseOptions(product).map((option) => option.id)).toEqual(["hosted_multilink"]);
  });
});
