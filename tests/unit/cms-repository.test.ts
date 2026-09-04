import { describe, expect, it, vi } from "vitest";
import {
  deleteProductContentBySlugs,
  getDefaultHomepageContent,
  saveAdminConfig,
  saveHomepageContent,
  savePageContent,
  saveProductContent,
  type CmsDbClient
} from "@/lib/cms-repository";

function createDbClient() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const insert = vi.fn().mockResolvedValue({ error: null });
  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const deleteAction = vi.fn(() => ({ eq: deleteEq }));
  const from = vi.fn(() => ({ upsert, insert, delete: deleteAction }));
  return { client: { from } as unknown as CmsDbClient, from, upsert, insert, deleteAction, deleteEq };
}

function createDeleteDbClient() {
  const select = vi.fn().mockResolvedValue({ data: [{ slug: "google-review-stand" }], error: null });
  const inFilter = vi.fn(() => ({ select }));
  const deleteAction = vi.fn(() => ({ in: inFilter }));
  const from = vi.fn(() => ({ delete: deleteAction }));
  return { client: { from } as unknown as CmsDbClient, from, deleteAction, inFilter, select };
}

describe("cms repository", () => {
  it("provides default homepage content", () => {
    const content = getDefaultHomepageContent();

    expect(content.heroTitle).toContain("NFC & QR stands");
    expect(content.primaryButtonHref).toBe("/shop");
    expect(content.secondaryButtonHref).toBe("/custom-stands");
    expect(content.featuredLabel).toBe("Physical stands");
  });

  it("stores homepage content in site_content", async () => {
    const db = createDbClient();
    const content = getDefaultHomepageContent();

    await saveHomepageContent(db.client, content);

    expect(db.from).toHaveBeenCalledWith("site_content");
    expect(db.upsert).toHaveBeenCalledWith({
      key: "homepage",
      type: "homepage",
      status: "published",
      payload: content
    });
  });

  it("stores editable page content by slug", async () => {
    const db = createDbClient();

    await savePageContent(db.client, {
      slug: "about-us",
      title: "About Tap Rater",
      seoTitle: "About Tap Rater",
      seoDescription: "About Tap Rater NFC review products.",
      body: "Tap Rater helps businesses collect reviews.",
      status: "draft"
    });

    expect(db.upsert).toHaveBeenCalledWith({
      key: "page:about-us",
      type: "page",
      status: "draft",
      payload: {
        slug: "about-us",
        title: "About Tap Rater",
        seoTitle: "About Tap Rater",
        seoDescription: "About Tap Rater NFC review products.",
        body: "Tap Rater helps businesses collect reviews.",
        status: "draft"
      }
    });
  });

  it("stores admin ecommerce configuration by area", async () => {
    const db = createDbClient();

    await saveAdminConfig(db.client, {
      area: "shipping",
      title: "Shipping",
      status: "draft",
      settings: {
        primary: "US flat rate",
        secondary: "Free shipping over $150",
        notes: "Use manual rules before Stripe stage."
      }
    });

    expect(db.upsert).toHaveBeenCalledWith({
      key: "admin:shipping",
      type: "section",
      status: "draft",
      payload: {
        area: "shipping",
        title: "Shipping",
        status: "draft",
        settings: {
          primary: "US flat rate",
          secondary: "Free shipping over $150",
          notes: "Use manual rules before Stripe stage."
        }
      }
    });
  });

  it("maps product content to product database columns", async () => {
    const db = createDbClient();

    await saveProductContent(db.client, {
      slug: "google-review-white-stand",
      title: "White Stand - Google Review",
      sku: "TRATER01",
      categorySlug: "google-review-stands",
      standTypeSlug: "review-stands",
      primaryPlatformSlug: "google",
      destinationType: "review",
      businessUseSlugs: ["retail-local-business"],
      isSpecialSolution: false,
      productKind: "normal_direct",
      status: "draft",
      sortOrder: 20,
      basePriceCents: 4900,
      salePriceCents: undefined,
      stockStatus: "instock",
      shortDescription: "Short product text",
      description: "Long product text",
      productType: "physical_redirect",
      serviceMode: "basic_redirect",
      checkoutMode: "buy_now",
      requiresAccount: false,
      requiresSubscription: false,
      requiresLandingPage: false,
      supportsMultiLink: false,
      supportedDestinations: ["google"],
      activationType: "free_basic_activation",
      includedServiceLabel: "Free basic activation",
      format: "stand",
      customizationOptions: ["standard_design", "add_logo", "custom_design"],
      allowsLogoUpload: true,
      allowsCustomDesign: true,
      designMode: "standard",
      assetSet: {
        standardAngledImageUrl: "/uploads/products/google-review-stand.png",
        brandedAngledImageUrl: "/uploads/products/google-review-stand-branded.png",
        brandedFrontTemplateUrl: "/uploads/products/google-review-front-template.png"
      },
      defaultCtaText: "Review us on Google",
      ctaEditable: true,
      assetReadinessStatus: "ready",
      productOptions: [
        {
          optionCode: "standard_direct",
          title: "Standard Direct",
          description: "NFC only",
          priceCents: 3900,
          requiresDestinationUrl: true,
          hasQr: false,
          requiresLogo: false,
          requiresBusinessName: false,
          requiresDesignStep: false,
          requiresFrontProof: false,
          requiresSubscription: false,
          accountRequired: false,
          supportsReorderableLinks: false,
          supportsLinkVisibility: false,
          isActive: true,
          sortOrder: 10
        }
      ],
      images: [{ src: "/uploads/products/google-review-stand.png", alt: "Google Review Stand" }],
      seoTitle: "SEO title",
      seoDescription: "SEO description",
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
        }
      ],
      colorOptions: [{ code: "white", label: "White", skuSuffix: "WHT", priceAdjustmentCents: 0, isDefault: true, isActive: true }],
      keyFeatures: [{ title: "Tap + Scan", body: "NFC and QR." }],
      howItWorks: [{ step: 1, title: "Add link", body: "Provide destination." }],
      specifications: [{ label: "Material", value: "Acrylic" }],
      includedItems: [{ label: "Programmed NFC chip", appliesTo: "all" }],
      productFaqs: [{ question: "Ready to use?", answer: "Yes." }],
      isActive: true
    });

    expect(db.from).toHaveBeenCalledWith("products");
    expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({
      slug: "google-review-white-stand",
      title: "White Stand - Google Review",
      sku: "TRATER01",
      category_slug: "google-review-stands",
      stand_type_slug: "review-stands",
      primary_platform_slug: "google",
      destination_type: "review",
      is_special_solution: false,
      product_kind: "normal_direct",
      status: "draft",
      sort_order: 20,
      base_price_cents: 4900,
      sale_price_cents: null,
      stock_status: "instock",
      short_description: "Short product text",
      description: "Long product text",
      product_type: "physical_redirect",
      service_mode: "basic_redirect",
      checkout_mode: "buy_now",
      requires_account: false,
      requires_subscription: false,
      requires_landing_page: false,
      supported_destinations: ["google"],
      activation_type: "free_basic_activation",
      included_service_label: "Free basic activation",
      format: "stand",
      customization_options: ["standard_design", "add_logo", "custom_design"],
      allows_logo_upload: true,
      allows_custom_design: true,
      design_mode: "standard",
      standard_angled_image_url: "/uploads/products/google-review-stand.png",
      branded_angled_image_url: "/uploads/products/google-review-stand-branded.png",
      branded_front_template_url: "/uploads/products/google-review-front-template.png",
      default_cta_text: "Review us on Google",
      cta_editable: true,
      landing_page_preview_config: {},
      asset_readiness_status: "ready",
      images: [{ src: "/uploads/products/google-review-stand.png", alt: "Google Review Stand" }],
      seo_title: "SEO title",
      seo_description: "SEO description",
      search_keywords: ["google review stand"],
      size_options: expect.any(Array),
      color_options: expect.any(Array),
      key_features: expect.any(Array),
      how_it_works: expect.any(Array),
      specifications: expect.any(Array),
      included_items: expect.any(Array),
      product_faqs: expect.any(Array),
      is_active: true
    }));
    expect(db.from).toHaveBeenCalledWith("product_business_uses");
    expect(db.deleteEq).toHaveBeenCalledWith("product_slug", "google-review-white-stand");
    expect(db.insert).toHaveBeenCalledWith([
      {
        product_slug: "google-review-white-stand",
        business_use_slug: "retail-local-business",
        sort_order: 10
      }
    ]);
    expect(db.from).toHaveBeenCalledWith("product_options");
    expect(db.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          product_slug: "google-review-white-stand",
          option_code: "standard_direct",
          price_cents: 3900,
          is_active: true
        })
      ],
      { onConflict: "product_slug,option_code" }
    );
  });

  it("deletes products by slug through a filtered products-table delete", async () => {
    const db = createDeleteDbClient();

    const deletedSlugs = await deleteProductContentBySlugs(db.client, ["google-review-stand"]);

    expect(deletedSlugs).toEqual(["google-review-stand"]);
    expect(db.from).toHaveBeenCalledWith("products");
    expect(db.deleteAction).toHaveBeenCalled();
    expect(db.inFilter).toHaveBeenCalledWith("slug", ["google-review-stand"]);
    expect(db.select).toHaveBeenCalledWith("slug");
  });
});
