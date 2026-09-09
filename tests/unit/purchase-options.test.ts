import { afterEach, describe, expect, it } from "vitest";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { correctKnownPurchaseCopy, getProductPurchaseOptions, hasBrandedDirectProductionTemplate, isHostedPurchaseOptionEnabled } from "@/lib/purchase-options";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";

describe("purchase option readiness", () => {
  it("keeps Standard NFC-only with stale backend flags, preserving prices and active options", () => {
    const product = structuredClone(migratedProducts.find((item) => item.slug === "google-review-stand")!);
    const standard = product.purchaseOptions![0];
    standard.hasQr = true;
    standard.priceCents = 5700;
    standard.title = "Reception stand";
    standard.description = "Made for our reception desk.";
    const before = structuredClone(product);

    expect(getProductPurchaseOptions(product)[0]).toMatchObject({
      id: "standard_direct", hasQr: false, priceCents: 5700,
      label: "Reception stand", summary: "Made for our reception desk."
    });
    expect(getProductPurchaseOptions(product)[1]).toMatchObject({
      id: "branded_qr_direct", hasQr: true, requiresLogo: true,
      requiresBusinessName: true, requiresFinalProof: true
    });
    expect(product).toEqual(before);
    standard.isActive = false;
    expect(getProductPurchaseOptions(product).map((option) => option.id)).toEqual(["branded_qr_direct"]);
    product.purchaseOptions = [];
    expect(getProductPurchaseOptions(product)).toEqual([]);
  });

  it("does not add QR to Standard when Multi-Link is compatible", () => {
    const product = migratedProducts.find((item) => item.slug === "rate-your-experience-stand")!;
    expect(productSupportsMultiLink(product)).toBe(true);
    expect(getProductPurchaseOptions(product).find((option) => option.id === "standard_direct")?.hasQr).toBe(false);
    expect(getProductPurchaseOptions({ ...product, purchaseOptions: undefined })[0].hasQr).toBe(false);
  });

  it("corrects known claims idempotently without removing adjacent custom copy", () => {
    const copy = "Ready-made Google Review Stand with QR and NFC programmed to the Google review link you provide. Includes our reception instructions.";
    const corrected = correctKnownPurchaseCopy(copy);
    expect(corrected).toContain("Standard is NFC-only, with no printed QR.");
    expect(corrected).toContain("Includes our reception instructions.");
    expect(correctKnownPurchaseCopy(corrected)).toBe(corrected);
    const custom = "Branded printed QR artwork: keep  two spaces and production notes.";
    expect(correctKnownPurchaseCopy(custom)).toBe(custom);
  });

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
    process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING = "false";
    const product = migratedProducts.find((item) => item.slug === "rate-your-experience-stand")!;

    expect(isHostedPurchaseOptionEnabled()).toBe(false);
    expect(productSupportsMultiLink(product)).toBe(true);
    expect(getProductPurchaseOptions(product).map((option) => option.id)).not.toContain("hosted_multilink");
  });

  it("models Multi-Link as a reusable $9.99 monthly service add-on", () => {
    expect(isHostedPurchaseOptionEnabled()).toBe(true);
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
