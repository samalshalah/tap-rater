import { describe, expect, it, vi } from "vitest";
import {
  getDefaultHomepageContent,
  saveAdminConfig,
  saveHomepageContent,
  savePageContent,
  saveProductContent,
  type CmsDbClient
} from "@/lib/cms-repository";

function createDbClient() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ upsert }));
  return { client: { from } as unknown as CmsDbClient, from, upsert };
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
      supportedDestinations: ["google"],
      activationType: "free_basic_activation",
      includedServiceLabel: "Free basic activation",
      customizationOptions: ["standard_design", "add_logo", "custom_design"],
      allowsLogoUpload: true,
      allowsCustomDesign: true,
      designMode: "standard",
      featured: true,
      images: [{ src: "/uploads/products/google.jpg", alt: "Google review stand" }],
      variants: [{ id: "white", label: "White", sku: "TRATER01-WHITE", stockStatus: "instock" }],
      seoTitle: "SEO title",
      seoDescription: "SEO description",
      isActive: true
    });

    expect(db.from).toHaveBeenCalledWith("products");
    expect(db.upsert).toHaveBeenCalledWith({
      slug: "google-review-white-stand",
      title: "White Stand - Google Review",
      sku: "TRATER01",
      category_slug: "google-review-stands",
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
      customization_options: ["standard_design", "add_logo", "custom_design"],
      allows_logo_upload: true,
      allows_custom_design: true,
      design_mode: "standard",
      featured: true,
      images: [{ src: "/uploads/products/google.jpg", alt: "Google review stand" }],
      variants: [{ id: "white", label: "White", sku: "TRATER01-WHITE", stockStatus: "instock" }],
      seo_title: "SEO title",
      seo_description: "SEO description",
      is_active: true
    });
  });
});
