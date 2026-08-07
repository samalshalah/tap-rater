import { describe, expect, it } from "vitest";
import { getActiveProducts } from "@/lib/products";
import { migratedProducts } from "@/data/migrated-products";
import { useCases, getUseCaseBySlug } from "@/data/use-cases";
import { createBlankAdminProduct } from "@/lib/admin-products";
import { normalizeStorefrontProductRow } from "@/lib/product-repository";

const validDesignLogicTypes = [
  "standard_platform_locked",
  "branded_platform_template",
  "text_action_locked",
  "text_action_branded",
  "fully_custom_design"
];

const validPricingTiers = ["standard_direct", "branded_qr_direct", "hosted_multi_link", "custom"];

describe("design logic model", () => {
  it("every product has a valid designLogic value", () => {
    for (const product of migratedProducts) {
      expect(validDesignLogicTypes).toContain(product.designLogic);
    }
  });

  it("every product has a valid pricingTier value", () => {
    for (const product of migratedProducts) {
      expect(validPricingTiers).toContain(product.pricingTier);
    }
  });

  it("every product's useCaseSlugs resolve to a real use case (no typos/broken references)", () => {
    for (const product of migratedProducts) {
      for (const slug of product.useCaseSlugs) {
        expect(getUseCaseBySlug(slug), `${product.slug} references unknown use case "${slug}"`).toBeDefined();
      }
    }
  });

  it("platform-branded review products (google/yelp/facebook/tripadvisor) use standard_platform_locked and carry a platformSlug", () => {
    const platformProducts = getActiveProducts().filter((p) => ["google", "yelp", "facebook", "tripadvisor"].includes(p.platformSlug ?? ""));

    expect(platformProducts.length).toBeGreaterThan(0);
    for (const product of platformProducts) {
      expect(product.designLogic).toBe("standard_platform_locked");
    }
  });

  it("text/action products (feedback, social, appointment, menu, website) use text_action_locked and have no platformSlug", () => {
    const textActionSlugs = [
      "rate-your-experience-stand",
      "follow-us-social-media-stand",
      "book-your-next-visit-stand",
      "view-our-menu-stand",
      "visit-our-website-stand"
    ];

    for (const slug of textActionSlugs) {
      const product = migratedProducts.find((p) => p.slug === slug);
      expect(product?.designLogic).toBe("text_action_locked");
      expect(product?.platformSlug).toBeUndefined();
    }
  });

  it("the Custom Direct Stand uses fully_custom_design and the custom pricing tier, at its existing intended price (not changed)", () => {
    const custom = migratedProducts.find((p) => p.slug === "custom-direct-stand");

    expect(custom?.designLogic).toBe("fully_custom_design");
    expect(custom?.pricingTier).toBe("custom");
    expect(custom?.basePriceCents).toBe(4900); // existing intended price, confirmed not changed
  });

  it("standard-tier products (built via the phaseOneProduct factory) are priced at $39, matching the standard_direct pricing tier", () => {
    const standardTierProducts = migratedProducts.filter((p) => p.pricingTier === "standard_direct");

    expect(standardTierProducts.length).toBeGreaterThan(0);
    for (const product of standardTierProducts) {
      expect(product.basePriceCents).toBe(3900);
    }
  });

  it("createBlankAdminProduct() includes valid defaults for the new required fields", () => {
    const blank = createBlankAdminProduct();

    expect(validDesignLogicTypes).toContain(blank.designLogic);
    expect(validPricingTiers).toContain(blank.pricingTier);
    expect(blank.useCaseSlugs).toEqual([]);
  });

  it("use-cases.ts exposes at least the core use cases referenced by existing products", () => {
    const referencedSlugs = new Set(migratedProducts.flatMap((p) => p.useCaseSlugs));
    for (const slug of referencedSlugs) {
      expect(useCases.map((u) => u.slug)).toContain(slug);
    }
  });
});

describe("normalizeStorefrontProductRow -- design logic fields", () => {
  it("reads designLogic/pricingTier/useCaseSlugs/platformSlug from a DB row", () => {
    const product = normalizeStorefrontProductRow({
      slug: "google-review-stand",
      title: "Google Review Stand",
      sku: "TR-GOOGLE-STAND",
      category_slug: "reviews",
      format: "stand",
      base_price_cents: 3900,
      stock_status: "instock",
      short_description: "short",
      description: "long",
      product_type: "physical_redirect",
      service_mode: "basic_redirect",
      checkout_mode: "buy_now",
      requires_account: false,
      requires_subscription: false,
      requires_landing_page: false,
      supported_destinations: ["google"],
      activation_type: "free_basic_activation",
      included_service_label: "Free basic activation",
      is_active: true,
      design_logic: "branded_platform_template",
      pricing_tier: "branded_qr_direct",
      use_case_slugs: ["restaurants-cafes", "retail-grocery"],
      platform_slug: "google"
    });

    expect(product).toMatchObject({
      designLogic: "branded_platform_template",
      pricingTier: "branded_qr_direct",
      useCaseSlugs: ["restaurants-cafes", "retail-grocery"],
      platformSlug: "google"
    });
  });

  it("falls back to static product data for design logic fields when the DB row omits them", () => {
    const product = normalizeStorefrontProductRow({
      slug: "google-review-stand",
      title: "Edited title only",
      sku: "TR-GOOGLE-STAND",
      category_slug: "reviews",
      format: "stand",
      base_price_cents: 3900,
      stock_status: "instock",
      short_description: "short",
      description: "long",
      product_type: "physical_redirect",
      service_mode: "basic_redirect",
      checkout_mode: "buy_now",
      requires_account: false,
      requires_subscription: false,
      requires_landing_page: false,
      supported_destinations: ["google"],
      activation_type: "free_basic_activation",
      included_service_label: "Free basic activation",
      is_active: true
      // design_logic / pricing_tier / use_case_slugs / platform_slug omitted on purpose
    });

    const staticProduct = migratedProducts.find((p) => p.slug === "google-review-stand");

    expect(product?.designLogic).toBe(staticProduct?.designLogic);
    expect(product?.pricingTier).toBe(staticProduct?.pricingTier);
    expect(product?.useCaseSlugs).toEqual(staticProduct?.useCaseSlugs);
    expect(product?.platformSlug).toBe(staticProduct?.platformSlug);
  });

  it("reads templateImages and providerOptions from DB jsonb columns when present", () => {
    const product = normalizeStorefrontProductRow({
      slug: "google-review-stand",
      title: "Google Review Stand",
      sku: "TR-GOOGLE-STAND",
      category_slug: "reviews",
      format: "stand",
      base_price_cents: 3900,
      stock_status: "instock",
      short_description: "short",
      description: "long",
      product_type: "physical_redirect",
      service_mode: "basic_redirect",
      checkout_mode: "buy_now",
      requires_account: false,
      requires_subscription: false,
      requires_landing_page: false,
      supported_destinations: ["google"],
      activation_type: "free_basic_activation",
      included_service_label: "Free basic activation",
      is_active: true,
      template_images: {
        standard: { src: "/uploads/templates/google-standard.png", alt: "Google standard template" },
        branded: { src: "/uploads/templates/google-branded.png", alt: "Google branded template" }
      },
      provider_options: [
        { slug: "vagaro", label: "Vagaro" },
        { slug: "calendly", label: "Calendly", destination_url_hint: "https://calendly.com/your-business" }
      ]
    });

    expect(product?.templateImages?.standard?.src).toBe("/uploads/templates/google-standard.png");
    expect(product?.templateImages?.branded?.alt).toBe("Google branded template");
    expect(product?.providerOptions).toEqual([
      { slug: "vagaro", label: "Vagaro", destinationUrlHint: undefined },
      { slug: "calendly", label: "Calendly", destinationUrlHint: "https://calendly.com/your-business" }
    ]);
  });
});
