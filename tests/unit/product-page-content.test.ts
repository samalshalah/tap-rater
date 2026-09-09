import { describe, expect, it } from "vitest";
import type { MigratedProduct } from "@/data/migrated-products";
import { migratedProducts } from "@/data/migrated-products";
import { getProductBySlug } from "@/lib/products";
import {
  getProductActivationCopy,
  getProductComparisonRows,
  getProductDestinationCopy,
  getProductFaqs,
  getProductHowItWorks,
  getProductIncludedItems,
  getProductPageHighlights,
  getProductPageUseCases,
  getReviewDestination,
  getProductServiceBadges,
  getProductSpecifications
} from "@/lib/product-page-content";

describe("product page content", () => {
  it("builds purchase highlights from the product", () => {
    const product = productFixture({
      slug: "google-review-stand",
      title: "Google Review Stand",
      keyFeatures: [
        { title: "Tap + Scan", body: "Customers can tap with NFC or scan the printed QR code." },
        { title: "Direct to Google", body: "NFC and QR both open the same Google review link you provide." },
        { title: "No App Required", body: "Customers use their phone NFC or camera." },
        { title: "No Subscription", body: "Direct stands are a one-time physical product purchase with no monthly fee." },
        { title: "Ready to Use", body: "Tap Rater programs the NFC and prepares the QR code before shipping." },
        { title: "Standard or Branded", body: "Choose the ready-made Google design or add your logo and business name." }
      ]
    });

    expect(getProductPageHighlights(product).map((highlight) => highlight.title)).toEqual([
      "NFC tap",
      "Direct to Google",
      "No App Required",
      "No Subscription",
      "Ready to Use",
      "Standard or Branded"
    ]);
    expect(getProductPageHighlights(product)[0].body).toContain("Standard is NFC-only, with no printed QR.");
    expect(product.keyFeatures?.[0].body).toBe("Customers can tap with NFC or scan the printed QR code.");
  });

  it("qualifies fallback connections for Standard and Branded, including Multi-Link-compatible products", () => {
    const product = productFixture({ supportsMultiLink: true, assetSet: { brandedFrontTemplateUrl: "/branded.png" } });
    const answer = getProductFaqs(product)[0].answer;
    expect(answer).toContain("Standard is NFC-only, with no printed QR.");
    expect(answer).toContain("Branded adds a QR code generated from the same destination.");
    expect(getProductPageHighlights(product)[0].body).toBe(answer);
    expect(getProductFaqs({ ...product, assetSet: {} })[0].answer).not.toContain("Branded adds");
  });

  it("corrects known saved details while retaining custom FAQs, steps, and feature bodies", () => {
    const product = productFixture({
      assetSet: { brandedFrontTemplateUrl: "/branded.png" },
      productFaqs: [
        { question: "How does this work?", answer: "Customers tap the stand with an NFC-enabled phone or scan the QR code. Both open the Google review link you provide." },
        { question: "Can I use printed instructions?", answer: "Yes. Keep the printed instructions beside your Branded QR." }
      ],
      howItWorks: [{ step: 1, title: "Our production notes", body: "Our custom production notes remain unchanged." }],
      keyFeatures: [{ title: "Tap + Scan", body: "Our custom Branded printed QR connects to the front desk." }]
    });
    expect(getProductFaqs(product)[0].answer).toContain("Standard is NFC-only");
    expect(getProductFaqs(product)[1]).toEqual(product.productFaqs![1]);
    expect(getProductHowItWorks(product)).toEqual(product.howItWorks);
    expect(getProductPageHighlights(product)).toEqual(product.keyFeatures);
  });

  it("qualifies known QR specifications and included items without changing custom details", () => {
    const product = productFixture({
      specifications: [{ label: "Connectivity", value: "NFC + QR" }, { label: "Finish", value: "Our printed finish" }],
      includedItems: [{ label: "Printed QR code", appliesTo: "all" }, { label: "Printed setup instructions", appliesTo: "all" }]
    });
    expect(getProductSpecifications(product)[0].value).toBe("Standard: NFC only, no printed QR. Branded: NFC and printed QR.");
    expect(getProductSpecifications(product)[1]).toEqual(product.specifications![1]);
    expect(getProductIncludedItems(product)[0]).toEqual({ label: "Printed QR code", appliesTo: "branded" });
    expect(getProductIncludedItems(product)[1]).toEqual(product.includedItems![1]);
    expect(product.includedItems![0].appliesTo).toBe("all");
  });

  it("returns business use cases for local customer touchpoints", () => {
    const product = getProductBySlug("google-review-stand");

    expect(getProductPageUseCases(product!)).toHaveLength(4);
    expect(getProductPageUseCases(product!)[0].title).toBe("Restaurants and cafes");
  });

  it("marks the active product type in comparison rows", () => {
    const stand = getProductBySlug("google-review-stand");
    const custom = migratedProducts.find((product) => product.slug === "custom-direct-stand");

    expect(getProductComparisonRows(stand!).find((row) => row.label === "Stand")?.active).toBe(true);
    expect(getProductComparisonRows(custom!).find((row) => row.label === "Custom")?.active).toBe(true);
  });

  it("builds customer-facing service badges from product strategy metadata", () => {
    const stand = getProductBySlug("google-review-stand");
    const feedback = getProductBySlug("rate-your-experience-stand");

    expect(getProductServiceBadges(stand!)).toEqual(["One-time direct setup", "Free basic activation"]);
    expect(getProductServiceBadges(feedback!)).toEqual(["One-time direct setup", "Free basic activation"]);
  });

  it("explains physical redirect activation", () => {
    const stand = getProductBySlug("google-review-stand");
    const feedback = getProductBySlug("rate-your-experience-stand");

    expect(getProductActivationCopy(stand!).body).toContain("connects directly");
    expect(getProductActivationCopy(feedback!).body).toContain("connects directly");
    expect(getProductActivationCopy(feedback!).body).toContain("business link");
  });

  it.each([
    [
      "google-review-stand",
      { primaryPlatformSlug: "google", destinationType: "review", standTypeSlug: "review-stands", categorySlug: "reviews" },
      "Google review",
      "Google review destination"
    ],
    [
      "yelp-review-stand",
      { primaryPlatformSlug: "yelp", destinationType: "review", standTypeSlug: "review-stands", categorySlug: "reviews" },
      "Yelp review",
      "Yelp review destination"
    ],
    [
      "facebook-review-stand",
      { primaryPlatformSlug: "facebook", destinationType: "review", standTypeSlug: "review-stands", categorySlug: "reviews" },
      "Facebook review",
      "Facebook review destination"
    ],
    [
      "view-menu-stand",
      { primaryPlatformSlug: "custom-menu-url", destinationType: "menu", standTypeSlug: "menu-info-stands", categorySlug: "menu" },
      "menu",
      "menu URL"
    ],
    [
      "book-appointment-stand",
      {
        primaryPlatformSlug: "custom-booking-url",
        destinationType: "booking",
        standTypeSlug: "appointment-reservation-stands",
        categorySlug: "appointments"
      },
      "booking",
      "booking URL"
    ],
    [
      "follow-us-stand",
      { primaryPlatformSlug: "custom-url", destinationType: "social", standTypeSlug: "social-media-stands", categorySlug: "social-media" },
      "social media",
      "social profile"
    ],
    [
      "rate-your-experience-stand",
      { primaryPlatformSlug: "custom-url", destinationType: "feedback", standTypeSlug: "feedback-survey-stands", categorySlug: "feedback" },
      "feedback",
      "feedback form"
    ],
    [
      "visit-website-stand",
      { primaryPlatformSlug: "website", destinationType: "website", standTypeSlug: "website-link-stands", categorySlug: "website-links" },
      "website",
      "website link"
    ]
  ])("derives destination copy for %s from structured product fields", (_slug, overrides, label, highlightTarget) => {
    const typedOverrides = overrides as Partial<MigratedProduct>;
    const product = productFixture(typedOverrides);

    expect(getReviewDestination(product)).toBe(label);
    expect(getProductDestinationCopy(product)).toMatchObject({ label, highlightTarget });
    expect(getProductPageHighlights(product)[0].body).toContain(`open your ${highlightTarget} without searching`);
  });

  it("does not default unknown direct products to Google review copy", () => {
    const product = productFixture({
      title: "Tabletop Stand",
      primaryPlatformSlug: "custom-url",
      destinationType: "custom",
      standTypeSlug: undefined,
      categorySlug: "custom-stands"
    });

    expect(getReviewDestination(product)).toBe("direct link");
    expect(getProductPageHighlights(product)[0].body).toContain("destination link");
    expect(getProductPageHighlights(product)[0].body).not.toContain("Google review");
  });

  it("uses hosted multi-link copy for hosted products", () => {
    const product = productFixture({
      title: "Hosted Multi-Link Stand",
      productKind: "hosted_multilink",
      requiresLandingPage: true,
      requiresSubscription: true,
      serviceMode: "hosted_landing_page",
      destinationType: "hosted_multilink",
      primaryPlatformSlug: "custom-url"
    });

    expect(getReviewDestination(product)).toBe("hosted multi-link page");
    expect(getProductPageHighlights(product)[0].body).toContain("hosted Tap Rater page");
  });

  it("explains the paid add-on without implying that Direct needs a subscription", () => {
    const faqs = getProductFaqs(productFixture({ supportsMultiLink: true }));
    const answer = faqs.find((faq) => faq.question === "Does this require a subscription?")?.answer;

    expect(answer).toContain("Direct stands are a one-time purchase with no monthly subscription.");
    expect(answer).toContain("$9.99/month per page");
    expect(answer).toContain("in addition to the physical stand price");
    expect(answer).toContain("10 editable links");
    expect(answer).toContain("Tap Rater account");
  });

  it("corrects the known stale subscription FAQ while preserving unrelated custom FAQs", () => {
    const customFaq = { question: "Where can I place it?", answer: "At reception." };
    const product = productFixture({
      supportsMultiLink: true,
      productFaqs: [customFaq, { question: "Does this require a subscription?", answer: "No." }]
    });
    const faqs = getProductFaqs(product);

    expect(faqs).toHaveLength(2);
    expect(faqs[0]).toEqual(customFaq);
    expect(faqs[1].answer).toContain("$9.99/month");
    expect(product.productFaqs?.[1].answer).toBe("No.");
  });

  it("adds a subscription explanation when a compatible product only has custom questions", () => {
    const faqs = getProductFaqs(productFixture({
      supportsMultiLink: true,
      productFaqs: [{ question: "Where can I place it?", answer: "At reception." }]
    }));

    expect(faqs).toHaveLength(2);
    expect(faqs[1].answer).toContain("$9.99/month");
  });

  it("does not advertise Multi-Link for an incompatible Direct product", () => {
    const faqs = getProductFaqs(productFixture({ supportsMultiLink: false }));
    expect(faqs.find((faq) => faq.question === "Does this require a subscription?")?.answer)
      .toBe("Direct stands are a one-time purchase with no monthly subscription.");
  });

  it("never describes a subscription-required hosted product as subscription-free", () => {
    const faqs = getProductFaqs(productFixture({ productKind: "hosted_multilink", requiresSubscription: true }));
    const answer = faqs.find((faq) => faq.question === "Does this require a subscription?")?.answer;

    expect(answer).toContain("requires a $9.99/month subscription per page");
    expect(answer).not.toContain("no monthly subscription");
  });
});

function productFixture(overrides: Partial<MigratedProduct> = {}): MigratedProduct {
  return {
    slug: "test-product",
    title: "Test Product",
    sku: "TEST",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "google",
    destinationType: "review",
    productKind: "normal_direct",
    status: "active",
    basePriceCents: 3900,
    stockStatus: "instock",
    shortDescription: "Test product.",
    description: "Test product.",
    productType: "physical_redirect",
    serviceMode: "basic_redirect",
    checkoutMode: "buy_now",
    requiresAccount: false,
    requiresSubscription: false,
    requiresLandingPage: false,
    supportedDestinations: ["custom-url"],
    activationType: "free_basic_activation",
    includedServiceLabel: "Free basic activation",
    format: "stand",
    customizationOptions: ["standard_design", "add_logo"],
    allowsLogoUpload: true,
    allowsCustomDesign: false,
    designMode: "standard",
    images: [],
    variants: [],
    isActive: true,
    ...overrides
  };
}
