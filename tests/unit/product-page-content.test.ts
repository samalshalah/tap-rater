import { describe, expect, it } from "vitest";
import type { MigratedProduct } from "@/data/migrated-products";
import { migratedProducts } from "@/data/migrated-products";
import { getProductBySlug } from "@/lib/products";
import {
  getProductActivationCopy,
  getProductComparisonRows,
  getProductDestinationCopy,
  getProductPageHighlights,
  getProductPageUseCases,
  getReviewDestination,
  getProductServiceBadges
} from "@/lib/product-page-content";

describe("product page content", () => {
  it("builds purchase highlights from the product", () => {
    const product = getProductBySlug("google-review-stand");

    expect(product).toBeDefined();
    expect(getProductPageHighlights(product!).map((highlight) => highlight.title)).toEqual([
      "Tap or scan ready",
      "Connects to one destination URL",
      "Countertop physical product",
      "Simple customer prompt"
    ]);
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

    expect(getProductServiceBadges(stand!)).toEqual(["No monthly fee required", "Free basic activation"]);
    expect(getProductServiceBadges(feedback!)).toEqual(["No monthly fee required", "Free basic activation"]);
  });

  it("explains physical redirect activation", () => {
    const stand = getProductBySlug("google-review-stand");
    const feedback = getProductBySlug("rate-your-experience-stand");

    expect(getProductActivationCopy(stand!).body).toContain("connects directly");
    expect(getProductActivationCopy(feedback!).body).toContain("connects directly");
    expect(getProductActivationCopy(feedback!).body).toContain("No monthly fee");
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
