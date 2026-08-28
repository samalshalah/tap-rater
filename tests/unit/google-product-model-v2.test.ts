import { describe, expect, it } from "vitest";
import { getProductFaqs } from "@/lib/product-page-content";
import { generateProductVariantSku, getConfiguredUnitPriceCents } from "@/lib/product-model";
import { normalizeStorefrontProductRow } from "@/lib/product-repository";
import { brandedQrDirectOption, standardDirectOption } from "@/lib/purchase-options";

const googleProduct = normalizeStorefrontProductRow(
  {
    slug: "google-review-stand",
    title: "Google Review Stand",
    sku: "TR-GOOGLE-REV-ST",
    category_slug: "reviews",
    stand_type_slug: "stand",
    primary_platform_slug: "google",
    destination_type: "review",
    is_special_solution: false,
    product_kind: "normal_direct",
    status: "active",
    format: "stand",
    base_price_cents: 3900,
    stock_status: "instock",
    short_description: "Countertop Google Review Stand with NFC and QR.",
    description: "Customers tap with NFC or scan QR to open the Google review link.",
    product_type: "physical_redirect",
    service_mode: "basic_redirect",
    checkout_mode: "buy_now",
    requires_account: false,
    requires_subscription: false,
    requires_landing_page: false,
    supported_destinations: ["google"],
    activation_type: "free_basic_activation",
    included_service_label: "Programmed and ready to use",
    customization_options: ["standard_design", "add_logo"],
    allows_logo_upload: true,
    allows_custom_design: false,
    design_mode: "standard",
    standard_angled_image_url: "/uploads/products/google-review-stand.png",
    branded_angled_image_url: "/uploads/products/google-review-stand-branded-angled.jpg",
    branded_front_template_url: "/uploads/products/google-review-stand-branded-front-template.jpg",
    images: [],
    is_active: true,
    size_options: [
      {
        code: "regular",
        label: "Standard",
        frontWidthMm: 108,
        frontHeightMm: 165,
        frontWidthIn: 4.25,
        frontHeightIn: 6.5,
        baseDepthMm: 50,
        baseDepthIn: 1.97,
        skuSuffix: "REG",
        priceAdjustmentCents: 0,
        isDefault: true,
        isActive: true
      },
      {
        code: "a4",
        label: "Large - A4",
        frontWidthMm: 210,
        frontHeightMm: 297,
        frontWidthIn: 8.27,
        frontHeightIn: 11.69,
        baseDepthMm: 80,
        baseDepthIn: 3.15,
        skuSuffix: "A4",
        priceAdjustmentCents: null,
        isDefault: false,
        isActive: true
      }
    ],
    color_options: [{ code: "white", label: "White", skuSuffix: "WHT", priceAdjustmentCents: 0, isDefault: true, isActive: true }],
    product_faqs: [
      {
        question: "How does the Google Review Stand work?",
        answer: "Customers tap the stand with an NFC-enabled phone or scan the QR code. Both open the Google review link you provide."
      }
    ]
  },
  { sanitizePublicCopy: false }
);

describe("Google Product Model V2", () => {
  it("preserves Google media and exposes only backend-provided size and color options", () => {
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

  it("uses backend product FAQs as the FAQ schema source", () => {
    expect(googleProduct).toBeDefined();
    if (!googleProduct) return;

    const faqs = getProductFaqs(googleProduct);
    expect(faqs).toEqual(googleProduct.productFaqs);
    expect(faqs[0]).toMatchObject({ question: "How does the Google Review Stand work?" });
  });
});
