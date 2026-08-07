import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { getProductPurchaseOptions, getPurchaseOptionForProduct, productToPurchaseOption } from "@/lib/purchase-options";

const google = migratedProducts.find((p) => p.slug === "google-review-stand")!;
const googleBranded = migratedProducts.find((p) => p.slug === "google-review-stand-branded-qr")!;
const custom = migratedProducts.find((p) => p.slug === "custom-direct-stand")!;
const hostedMultiLink = migratedProducts.find((p) => p.slug === "hosted-multi-link-stand")!;

describe("productToPurchaseOption -- derives from the real product, no hardcoded prices", () => {
  it("uses the product's own real price, not a hardcoded constant", () => {
    expect(productToPurchaseOption(google).priceCents).toBe(google.basePriceCents);
    expect(productToPurchaseOption(googleBranded).priceCents).toBe(googleBranded.basePriceCents);
    // These must differ -- if this ever fails, it means pricing collapsed
    // back to a shared hardcoded value again.
    expect(productToPurchaseOption(google).priceCents).not.toBe(productToPurchaseOption(googleBranded).priceCents);
  });

  it("uses the product's own title as the label, not a generic tier name", () => {
    expect(productToPurchaseOption(google).label).toBe("Google Review Stand");
    expect(productToPurchaseOption(googleBranded).label).toBe("Google Review Stand - Branded + QR");
  });

  it("does not require a business name or logo for a standard_platform_locked product", () => {
    const option = productToPurchaseOption(google);
    expect(option.requiresBusinessName).toBe(false);
    expect(option.requiresLogo).toBe(false);
    expect(option.requiresManualCollection).toBe(false);
  });

  it("requires a business name and logo for a branded_platform_template product", () => {
    const option = productToPurchaseOption(googleBranded);
    expect(option.requiresBusinessName).toBe(true);
    expect(option.requiresLogo).toBe(true);
    expect(option.requiresManualCollection).toBe(true);
  });

  it("requires custom text only for fully_custom_design products", () => {
    expect(productToPurchaseOption(custom).requiresCustomText).toBe(true);
    expect(productToPurchaseOption(google).requiresCustomText).toBe(false);
    expect(productToPurchaseOption(googleBranded).requiresCustomText).toBe(false);
  });

  it("requires manual collection for Hosted Multi-Link Stand (branded by nature, not the free/basic tier)", () => {
    const option = productToPurchaseOption(hostedMultiLink);
    expect(option.requiresBusinessName).toBe(true);
    expect(option.requiresManualCollection).toBe(true);
    expect(option.id).toBe("hosted_multi_link");
  });
});

describe("getProductPurchaseOptions -- the in-page upsell selector", () => {
  it("offers both real tier products (Standard + Branded + QR) as an upsell, with their real prices", () => {
    const options = getProductPurchaseOptions(google, migratedProducts);

    expect(options).toHaveLength(2);
    const standardOption = options.find((o) => o.id === "standard_direct");
    const brandedOption = options.find((o) => o.id === "branded_qr_direct");

    expect(standardOption?.productSlug).toBe("google-review-stand");
    expect(standardOption?.priceCents).toBe(3900);
    expect(brandedOption?.productSlug).toBe("google-review-stand-branded-qr");
    expect(brandedOption?.priceCents).toBe(4900);
  });

  it("finds the same sibling pair whether starting from the standard or the branded product's page", () => {
    const fromStandard = getProductPurchaseOptions(google, migratedProducts);
    const fromBranded = getProductPurchaseOptions(googleBranded, migratedProducts);

    expect(fromStandard.map((o) => o.productSlug).sort()).toEqual(fromBranded.map((o) => o.productSlug).sort());
  });

  it("returns only itself for Custom Direct Stand (no standard/branded pair to derive from)", () => {
    const options = getProductPurchaseOptions(custom, migratedProducts);
    expect(options).toHaveLength(1);
    expect(options[0].productSlug).toBe("custom-direct-stand");
  });

  it("returns only itself for Hosted Multi-Link Stand (no standard/branded pair)", () => {
    const options = getProductPurchaseOptions(hostedMultiLink, migratedProducts);
    expect(options).toHaveLength(1);
    expect(options[0].productSlug).toBe("hosted-multi-link-stand");
  });

  it("never returns an empty list", () => {
    for (const product of migratedProducts.filter((p) => p.isActive)) {
      expect(getProductPurchaseOptions(product, migratedProducts).length).toBeGreaterThan(0);
    }
  });
});

describe("getPurchaseOptionForProduct", () => {
  it("is the correct source of truth cart.ts and checkout.ts use to price a cart line -- always the real product's price", () => {
    for (const product of migratedProducts.filter((p) => p.isActive)) {
      const option = getPurchaseOptionForProduct(product);
      expect(option.priceCents).toBe(product.salePriceCents ?? product.basePriceCents);
      expect(option.productSlug).toBe(product.slug);
    }
  });
});
