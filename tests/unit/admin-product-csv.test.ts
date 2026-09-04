import { describe, expect, it } from "vitest";
import type { MigratedProduct } from "@/data/migrated-products";
import { buildImportPlan, buildProductsCsv, PRODUCT_CSV_HEADERS } from "@/lib/admin-product-csv";
import { encodeCsv, parseCsv } from "@/lib/csv";

const taxonomy = {
  standTypes: [{ slug: "review-stands", title: "Review Stands", description: "", sortOrder: 10, isActive: true }],
  businessUses: [
    { slug: "restaurant-food", title: "Restaurant / Food", description: "", sortOrder: 10, isActive: true },
    { slug: "healthcare-dental", title: "Healthcare / Dental", description: "", sortOrder: 20, isActive: true }
  ],
  platforms: [{ slug: "google", title: "Google", destinationType: "review" as const, googlePlacesEnabled: true, manualUrlAllowed: true, isActive: true }]
};

describe("admin product CSV", () => {
  it("exports all product columns and supports headers-only templates", () => {
    const csv = buildProductsCsv([]);
    expect(csv).toBe(PRODUCT_CSV_HEADERS.join(","));
    expect(PRODUCT_CSV_HEADERS).toContain("product_options_json");
    expect(PRODUCT_CSV_HEADERS).toContain("images_json");
    expect(PRODUCT_CSV_HEADERS).toContain("size_options_json");
    expect(PRODUCT_CSV_HEADERS).toContain("product_faqs_json");
    expect(PRODUCT_CSV_HEADERS).not.toContain("landing_page_preview_config_json");
    expect(PRODUCT_CSV_HEADERS).not.toContain("default_cta_text");
    expect(PRODUCT_CSV_HEADERS).not.toContain("sale_price_cents");
  });

  it("round-trips product options, images, business uses, assets, SEO, multiline copy, unicode, and inactive rows", () => {
    const product = googleProduct({
      status: "archived",
      isActive: false,
      shortDescription: "Great food, faster reviews",
      description: "Line one\nLine \"two\" Café & patio"
    });
    const csv = buildProductsCsv([product]);
    const plan = buildImportPlan(csv, [product], taxonomy);

    expect(plan).toMatchObject({ ok: true, totalRows: 1, validRows: 1, createCount: 0, updateCount: 1 });
    expect(plan.products[0]).toMatchObject({
      slug: "google-review-stand",
      businessUseSlugs: ["restaurant-food", "healthcare-dental"],
      seoTitle: "Google Review Stand SEO",
      seoDescription: "Review us on Google.",
      isActive: false,
      status: "archived"
    });
    expect(plan.products[0].assetSet).toMatchObject({
      standardAngledImageUrl: "/uploads/products/google-review-stand.png",
      brandedFrontTemplateUrl: "/uploads/templates/google-branded-2026-08-27.3.svg"
    });
    expect(plan.products[0].assetSet.landingPagePreviewConfig).toBeUndefined();
    expect(plan.products[0].productOptions).toHaveLength(2);
    expect(plan.products[0].images).toEqual([{ src: "/uploads/products/google-review-stand.png", alt: "Google Review Stand" }]);
    expect(plan.products[0].sizeOptions?.[0]).toMatchObject({ code: "regular", skuSuffix: "REG", priceAdjustmentCents: 0 });
    expect(plan.products[0].sizeOptions?.[1]).toMatchObject({ code: "a4", skuSuffix: "A4", priceAdjustmentCents: null });
    expect(plan.products[0].colorOptions).toEqual([{ code: "white", label: "White", skuSuffix: "WHT", priceAdjustmentCents: 0, isDefault: true, isActive: true }]);
    expect(plan.products[0].productFaqs?.[0].question).toBe("How does the Google Review Stand work?");
  });

  it("creates new products and updates existing products by slug without deleting omitted products", () => {
    const existing = [googleProduct(), googleProduct({ slug: "omitted-product", sku: "OMITTED", title: "Omitted Product" })];
    const csv = buildProductsCsv([googleProduct({ slug: "new-product", sku: "NEW-1", title: "New Product" })]);
    const plan = buildImportPlan(csv, existing, taxonomy);

    expect(plan).toMatchObject({ ok: true, createCount: 1, updateCount: 0, totalRows: 1 });
    expect(existing).toHaveLength(2);
  });

  it("rejects duplicate slugs and SKU conflicts before writing", () => {
    const first = googleProduct({ slug: "google-review-stand", sku: "GRS" });
    const second = googleProduct({ slug: "google-review-stand", sku: "GRS-2" });
    const csv = [buildProductsCsv([first]), buildProductsCsv([second]).split(/\r?\n/)[1]].join("\r\n");
    const plan = buildImportPlan(csv, [googleProduct({ slug: "other-product", sku: "GRS" })], taxonomy);

    expect(plan.ok).toBe(false);
    expect(plan.errors.map((error) => error.message).join(" ")).toMatch(/already belongs|duplicate slug/);
    expect(plan.products).toEqual([]);
  });

  it("rejects unknown taxonomy references, invalid booleans, and malformed JSON", () => {
    const parsed = parseCsv(buildProductsCsv([googleProduct({ standTypeSlug: "missing-type", primaryPlatformSlug: "missing-platform" })]));
    parsed.rows[0].business_use_slugs = "unknown-use";
    parsed.rows[0].is_active = "maybe";
    parsed.rows[0].product_options_json = "{bad";
    const plan = buildImportPlan(encodeCsv(parsed.rows, parsed.headers), [], taxonomy);

    expect(plan.ok).toBe(false);
    expect(plan.errors.map((error) => error.message).join(" ")).toMatch(/unknown business use|unknown stand type|unknown platform|invalid boolean|malformed product_options_json/);
  });

  it("accepts an explicit empty product options array for replacement semantics", () => {
    const parsed = parseCsv(buildProductsCsv([googleProduct()]));
    parsed.rows[0].product_options_json = "[]";
    const plan = buildImportPlan(encodeCsv(parsed.rows, parsed.headers), [googleProduct()], taxonomy);

    expect(plan.ok).toBe(true);
    expect(plan.products[0].productOptions).toEqual([]);
  });
});

function googleProduct(overrides: Partial<MigratedProduct> = {}): MigratedProduct {
  return {
    slug: "google-review-stand",
    title: "Google Review Stand",
    sku: "GRS",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "google",
    destinationType: "review",
    businessUseSlugs: ["restaurant-food", "healthcare-dental"],
    isSpecialSolution: false,
    productKind: "normal_direct",
    status: "active",
    basePriceCents: 3900,
    salePriceCents: 4900,
    stockStatus: "instock",
    shortDescription: "Google Review Stand",
    description: "Google Review Stand",
    productType: "physical_redirect",
    serviceMode: "basic_redirect",
    checkoutMode: "buy_now",
    requiresAccount: false,
    requiresSubscription: false,
    requiresLandingPage: false,
    supportedDestinations: ["google"],
    activationType: "free_basic_activation",
    includedServiceLabel: "Free basic activation",
    format: "stand",
    customizationOptions: ["standard_design", "add_logo"],
    allowsLogoUpload: true,
    allowsCustomDesign: false,
    designMode: "logo",
    displayText: "Review us on Google",
    defaultCtaText: "Review us on Google",
    ctaEditable: true,
    assetReadinessStatus: "ready",
    assetSet: {
      standardAngledImageUrl: "/uploads/products/google-review-stand.png",
      brandedAngledImageUrl: "/uploads/products/google-branded.png",
      multiLinkAngledImageUrl: "/uploads/products/google-multilink.png",
      standardFrontTemplateUrl: "/uploads/templates/google-standard.svg",
      brandedFrontTemplateUrl: "/uploads/templates/google-branded-2026-08-27.3.svg",
      multiLinkFrontTemplateUrl: "/uploads/templates/google-multilink.svg",
      centerAssetUrl: "/uploads/logos/google.svg",
      landingPagePreviewConfig: { accent: "green" }
    },
    purchaseOptions: [
      {
        optionCode: "standard_direct",
        title: "Standard Direct Stand",
        description: "Standard, Direct",
        priceCents: 3900,
        requiresDestinationUrl: true,
        hasQr: true,
        requiresLogo: false,
        requiresBusinessName: false,
        requiresDesignStep: false,
        requiresFrontProof: false,
        requiresSubscription: false,
        accountRequired: false,
        isActive: true,
        sortOrder: 10
      },
      {
        optionCode: "branded_qr_direct",
        title: "Branded + QR Direct",
        description: "Branded",
        priceCents: 4900,
        requiresDestinationUrl: true,
        hasQr: true,
        requiresLogo: true,
        requiresBusinessName: true,
        requiresDesignStep: true,
        requiresFrontProof: true,
        requiresSubscription: false,
        accountRequired: false,
        isActive: true,
        sortOrder: 20
      }
    ],
    images: [{ src: "/uploads/products/google-review-stand.png", alt: "Google Review Stand" }],
    variants: [],
    isActive: true,
    seoTitle: "Google Review Stand SEO",
    seoDescription: "Review us on Google.",
    searchKeywords: ["google review stand"],
    sizeOptions: [
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
    colorOptions: [{ code: "white", label: "White", skuSuffix: "WHT", priceAdjustmentCents: 0, isDefault: true, isActive: true }],
    keyFeatures: [{ title: "Tap + Scan", body: "Customers can tap with NFC or scan the printed QR code." }],
    howItWorks: [{ step: 1, title: "Choose your design and size", body: "Select Standard or Branded." }],
    specifications: [{ label: "NFC chip", value: "NTAG213" }],
    includedItems: [{ label: "Acrylic NFC + QR stand", appliesTo: "all" }],
    productFaqs: [{ question: "How does the Google Review Stand work?", answer: "Customers tap or scan." }],
    updatedAt: "2026-08-28T00:00:00.000Z",
    ...overrides
  };
}
