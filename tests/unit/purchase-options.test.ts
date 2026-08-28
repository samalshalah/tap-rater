import { afterEach, describe, expect, it } from "vitest";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { getProductPurchaseOptions, hasBrandedDirectProductionTemplate, isHostedPurchaseOptionEnabled } from "@/lib/purchase-options";

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

  it("keeps HOSTED purchase options disabled by default", () => {
    const product = {
      ...migratedProducts.find((item) => item.slug === "rate-your-experience-stand")!,
      productKind: "hosted_multilink",
      requiresLandingPage: true,
      requiresSubscription: true,
      checkoutMode: "subscription",
      requiresAccount: true
    } satisfies MigratedProduct;

    expect(isHostedPurchaseOptionEnabled()).toBe(false);
    expect(getProductPurchaseOptions(product)).toEqual([]);
  });

  it("keeps HOSTED subscription checkout structurally available only when explicitly enabled", () => {
    process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING = "true";
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
