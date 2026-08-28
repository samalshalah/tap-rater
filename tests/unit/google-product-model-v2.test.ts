import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { getProductFaqs } from "@/lib/product-page-content";
import { generateProductVariantSku, getConfiguredUnitPriceCents } from "@/lib/product-model";
import { brandedQrDirectOption, standardDirectOption } from "@/lib/purchase-options";

const googleProduct = migratedProducts.find((product) => product.slug === "google-review-stand");

describe("Google Product Model V2", () => {
  it("preserves Google media and exposes only approved size and color options", () => {
    expect(googleProduct).toBeDefined();
    if (!googleProduct) return;

    expect(googleProduct.assetSet).toMatchObject({
      standardAngledImageUrl: "/uploads/products/google-review-stand.png",
      brandedAngledImageUrl: "/uploads/products/google-review-stand-branded-angled.jpg",
      brandedFrontTemplateUrl: "/uploads/products/google-review-stand-branded-front-template.jpg"
    });
    expect(googleProduct.colorOptions).toEqual([{ code: "white", label: "White", skuSuffix: "WHT", priceAdjustmentCents: 0, isDefault: true, isActive: true }]);
    expect(googleProduct.colorOptions?.some((color) => color.code === "black")).toBe(false);
    expect(googleProduct.sizeOptions?.map((size) => size.code)).toEqual(["regular", "a4"]);
  });

  it("generates controlled variant SKUs without title acronyms", () => {
    expect(googleProduct).toBeDefined();
    if (!googleProduct) return;

    expect(generateProductVariantSku(googleProduct, { purchaseOptionId: "standard_direct", sizeCode: "regular", colorCode: "white" })).toBe(
      "TR-GOOGLE-REV-ST-STD-REG-WHT"
    );
    expect(generateProductVariantSku(googleProduct, { purchaseOptionId: "branded_qr_direct", sizeCode: "regular", colorCode: "white" })).toBe(
      "TR-GOOGLE-REV-ST-BRD-REG-WHT"
    );
  });

  it("prices Standard size and leaves A4 unpurchasable until approved", () => {
    expect(googleProduct).toBeDefined();
    if (!googleProduct) return;

    expect(getConfiguredUnitPriceCents(googleProduct, standardDirectOption, { sizeCode: "regular", colorCode: "white" })).toBe(3900);
    expect(getConfiguredUnitPriceCents(googleProduct, brandedQrDirectOption, { sizeCode: "regular", colorCode: "white" })).toBe(4900);
    expect(getConfiguredUnitPriceCents(googleProduct, standardDirectOption, { sizeCode: "a4", colorCode: "white" })).toBeNull();
  });

  it("uses product FAQs as the FAQ schema source", () => {
    expect(googleProduct).toBeDefined();
    if (!googleProduct) return;

    const faqs = getProductFaqs(googleProduct);
    expect(faqs).toEqual(googleProduct.productFaqs);
    expect(faqs[0]).toMatchObject({ question: "How does the Google Review Stand work?" });
  });
});
