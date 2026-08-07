import { describe, expect, it } from "vitest";
import { getActiveProducts, getActiveUseCaseSlugs, getProductsByUseCase } from "@/lib/products";
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

  it("platform-branded review products (google/yelp/facebook/tripadvisor) use standard_platform_locked at the standard tier, and branded_platform_template at the Branded + QR tier", () => {
    const platformProducts = getActiveProducts().filter((p) => ["google", "yelp", "facebook", "tripadvisor"].includes(p.platformSlug ?? ""));

    expect(platformProducts.length).toBeGreaterThan(0);
    for (const product of platformProducts) {
      if (product.pricingTier === "standard_direct") {
        expect(product.designLogic).toBe("standard_platform_locked");
      } else if (product.pricingTier === "branded_qr_direct") {
        expect(product.designLogic).toBe("branded_platform_template");
      } else {
        throw new Error(`Unexpected pricing tier for a platform product: ${product.slug} (${product.pricingTier})`);
      }
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

  it("every branded_qr_direct product is a real, correctly-derived twin of a standard_direct product -- $49, distinct slug/sku, no leftover 'free basic activation' claim", () => {
    const brandedProducts = migratedProducts.filter((p) => p.pricingTier === "branded_qr_direct");

    expect(brandedProducts.length).toBe(17);
    for (const product of brandedProducts) {
      expect(product.basePriceCents).toBe(4900);
      expect(product.slug).toMatch(/-branded-qr$/);
      expect(product.sku).toMatch(/-BQR$/);
      expect(product.allowsLogoUpload).toBe(true);
      // "free basic activation" would be factually wrong for this tier
      // (it's a managed setup, not the free/basic tier) -- but base product
      // descriptions aren't perfectly uniform in phrasing (e.g. Yelp's says
      // "does not require a monthly fee" instead), so this only checks the
      // misleading claim is genuinely absent, not that one exact
      // replacement phrase was substituted in.
      expect(product.description).not.toContain("free basic activation");
      // Every branded twin has a corresponding standard product it was
      // derived from -- confirms this isn't orphaned/fabricated data.
      const standardSlug = product.slug.replace("-branded-qr", "");
      const standardTwin = migratedProducts.find((p) => p.slug === standardSlug);
      expect(standardTwin, `No standard product found for ${product.slug}`).toBeDefined();
      expect(standardTwin?.pricingTier).toBe("standard_direct");
      expect(product.useCaseSlugs).toEqual(standardTwin?.useCaseSlugs);
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

  it("getProductsByUseCase returns only active products actually tagged with that use case", () => {
    const restaurantProducts = getProductsByUseCase("restaurants-cafes");

    expect(restaurantProducts.length).toBeGreaterThan(0);
    expect(restaurantProducts.every((p) => p.useCaseSlugs.includes("restaurants-cafes"))).toBe(true);
    expect(restaurantProducts.every((p) => p.isActive)).toBe(true);
    // A product genuinely unrelated to restaurants (Zillow real estate
    // review) must not leak into this list.
    expect(restaurantProducts.some((p) => p.slug.startsWith("zillow"))).toBe(false);
  });

  it("getActiveUseCaseSlugs matches the real, verified per-use-case coverage documented in docs/catalog-scope-decision.md", () => {
    const activeSlugs = getActiveUseCaseSlugs();

    // Every use case in this project currently has real product coverage --
    // if this ever becomes false for a use case, /solutions would silently
    // stop showing it (by design, via getActiveUseCaseSlugs), which is
    // correct behavior but worth being deliberate about, not accidental.
    for (const useCase of useCases) {
      expect(activeSlugs.has(useCase.slug), `${useCase.slug} has zero active products`).toBe(true);
    }
  });

  it("Hosted Multi-Link Stand exists as its own product (previously entirely missing) with the correct design logic and pricing tier", () => {
    const product = migratedProducts.find((p) => p.slug === "hosted-multi-link-stand");

    expect(product).toBeDefined();
    expect(product?.isActive).toBe(true);
    expect(product?.designLogic).toBe("text_action_branded");
    expect(product?.pricingTier).toBe("hosted_multi_link");
    expect(product?.requiresSubscription).toBe(true);
    expect(product?.requiresLandingPage).toBe(true);
    expect(product?.checkoutMode).toBe("subscription");
    // $49 one-time setup fee -- the $9.90/month recurring component isn't
    // representable by basePriceCents alone; that's Stripe subscription
    // price ID territory, prepared but not wired to live billing yet.
    expect(product?.basePriceCents).toBe(4900);
  });

  it("booking tools (Vagaro, Fresha, Booksy, etc.) are provider options under Book Your Next Visit Stand, never standalone products", () => {
    const bookingProduct = migratedProducts.find((p) => p.slug === "book-your-next-visit-stand");
    const providerSlugs = bookingProduct?.providerOptions?.map((p) => p.slug) ?? [];

    expect(providerSlugs).toEqual(
      expect.arrayContaining(["vagaro", "fresha", "booksy", "mindbody", "zocdoc", "calendly", "acuity", "square-appointments", "opentable", "resy"])
    );

    // None of these providers exist as their own product slug anywhere in
    // the catalog -- this is the actual enforcement of the "not standalone
    // products" rule, not just a check that the options list looks right.
    const bookingProviderSlugs = ["vagaro", "fresha", "booksy", "mindbody", "zocdoc", "calendly", "acuity", "square-appointments", "opentable", "resy"];
    for (const providerSlug of bookingProviderSlugs) {
      expect(migratedProducts.some((p) => p.slug.includes(providerSlug))).toBe(false);
    }
  });

  it("form tools (Google Forms, Jotform, SurveyMonkey, Typeform) are provider options under Rate Your Experience Stand, never standalone products", () => {
    const feedbackProduct = migratedProducts.find((p) => p.slug === "rate-your-experience-stand");
    const providerSlugs = feedbackProduct?.providerOptions?.map((p) => p.slug) ?? [];

    expect(providerSlugs).toEqual(expect.arrayContaining(["google-forms", "jotform", "surveymonkey", "typeform"]));

    const formProviderSlugs = ["google-forms", "jotform", "surveymonkey", "typeform"];
    for (const providerSlug of formProviderSlugs) {
      expect(migratedProducts.some((p) => p.slug.includes(providerSlug))).toBe(false);
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
