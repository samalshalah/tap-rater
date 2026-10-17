import { describe, expect, it } from "vitest";
import {
  getActiveProducts,
  getCatalogCategories,
  getCategoryBySlug,
  getProductBySlug,
  getProductsByCategory
} from "@/lib/products";

describe("catalog categories", () => {
  it("exposes SEO category groups for the shop", () => {
    const categories = getCatalogCategories();

    expect(categories.map((category) => category.title)).toEqual([
      "Review Stands",
      "Social Media Stands",
      "Appointment & Reservation Stands",
      "Menu & Info Stands",
      "Feedback Stands",
      "Multi-Link Stand",
      "Custom Stands"
    ]);
  });

  it("resolves a category by slug", () => {
    const category = getCategoryBySlug("custom-stands");

    expect(category?.title).toBe("Custom Stands");
    expect(category?.seoTitle).toContain("Custom NFC Stands");
  });

  it("filters active products by category", () => {
    const products = getProductsByCategory("reviews");

    expect(products.map((product) => product.title)).toContain("Tap Rater Review Stand for Google Reviews");
    expect(products.map((product) => product.title)).not.toContain("Tap Rater Review Plate for Google Reviews");
    expect(products.every((product) => product.categorySlug === "reviews")).toBe(true);
  });

  it("keeps old category slugs working as aliases", () => {
    const category = getCategoryBySlug("google-review-stands");
    const products = getProductsByCategory("google-review-stands");

    expect(category?.slug).toBe("reviews");
    expect(products.map((product) => product.title)).toContain("Tap Rater Review Stand for Google Reviews");
  });

  it("adds product strategy metadata to every active product", () => {
    const products = getActiveProducts();

    expect(products.length).toBeGreaterThan(0);
    expect(
      products.every((product) => {
        return (
          ["physical_redirect", "physical_managed", "platform_landing_page", "bundle"].includes(product.productType) &&
          ["basic_redirect", "managed_redirect", "hosted_landing_page", "multi_location_platform"].includes(product.serviceMode) &&
          ["buy_now", "request_quote", "subscription", "contact_sales"].includes(product.checkoutMode) &&
          typeof product.requiresAccount === "boolean" &&
          typeof product.requiresSubscription === "boolean" &&
          typeof product.requiresLandingPage === "boolean" &&
          Array.isArray(product.supportedDestinations) &&
          product.supportedDestinations.length > 0 &&
          product.activationType.length > 0 &&
          product.includedServiceLabel.length > 0 &&
          ["stand", "plate", "bundle", "platform"].includes(product.format) &&
          Array.isArray(product.customizationOptions) &&
          product.customizationOptions.length > 0 &&
          typeof product.allowsLogoUpload === "boolean" &&
          typeof product.allowsCustomDesign === "boolean" &&
          ["standard", "logo", "custom"].includes(product.designMode)
        );
      })
    ).toBe(true);

    expect(getProductBySlug("google-review-stand")).toMatchObject({
      title: "Tap Rater Review Stand for Google Reviews",
      productType: "physical_redirect",
      serviceMode: "basic_redirect",
      checkoutMode: "buy_now",
      requiresAccount: false,
      requiresSubscription: false,
      requiresLandingPage: false,
      supportedDestinations: ["google"],
      includedServiceLabel: "Programmed and ready to use",
      format: "stand",
      customizationOptions: ["standard_design", "add_logo"],
      allowsLogoUpload: true,
      allowsCustomDesign: false,
      designMode: "standard",
      displayText: "Review us on Google"
    });
  });

  it("keeps regular launch products in standard/branded setup and reserves custom design for the custom stand", () => {
    const products = getActiveProducts();
    const customStand = getProductBySlug("custom-direct-stand");
    const regularProducts = products.filter((product) => product.slug !== "custom-direct-stand");

    expect(regularProducts.every((product) => product.customizationOptions.includes("standard_design"))).toBe(true);
    expect(regularProducts.every((product) => product.customizationOptions.includes("add_logo"))).toBe(true);
    expect(regularProducts.every((product) => !product.customizationOptions.includes("custom_design"))).toBe(true);
    expect(customStand).toMatchObject({
      title: "Tap Rater Custom Stand",
      allowsCustomDesign: true,
      supportsMultiLink: true
    });
  });

  it("groups active launch stands by customer use case", () => {
    const reviewProducts = getProductsByCategory("reviews");
    const socialProducts = getProductsByCategory("social-media");
    const appointmentProducts = getProductsByCategory("appointments");
    const menuProducts = getProductsByCategory("menu");
    const feedbackProducts = getProductsByCategory("feedback");
    const websiteProducts = getProductsByCategory("website-links");
    const customProducts = getProductsByCategory("custom-stands");

    expect(reviewProducts).toHaveLength(45);
    expect(socialProducts).toHaveLength(11);
    expect(appointmentProducts).toHaveLength(1);
    expect(menuProducts).toHaveLength(2);
    expect(feedbackProducts).toHaveLength(1);
    expect(websiteProducts).toHaveLength(5);
    expect(customProducts).toHaveLength(1);
    expect(reviewProducts.filter((product) => product.format === "stand")).toHaveLength(45);
    expect(getActiveProducts().every((product) => product.format === "stand")).toBe(true);
  });

  it("includes only the launch stand catalog as active storefront products", () => {
    const products = getActiveProducts();
    const titles = products.map((product) => product.title);

    expect(products).toHaveLength(66);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Tap Rater Review Stand for Google Reviews",
        "Tap Rater Review Stand for Facebook",
        "Tap Rater Review Stand for Yelp",
        "Tap Rater Review Stand for Tripadvisor",
        "Tap Rater Review Stand for Uber Eats",
        "Tap Rater Review Stand for Angi",
        "Tap Rater Review Stand for DealerRater",
        "Tap Rater Review Stand for Autotrader",
        "Tap Rater Review Stand for CARFAX",
        "Tap Rater Review Stand for Edmunds",
        "Tap Rater Review Stand for Cars.com",
        "Tap Rater Review Stand for CarGurus",
        "Tap Rater Review Stand for RepairPal",
        "Tap Rater Review Stand for SureCritic",
        "Tap Rater Review Stand for BBB",
        "Tap Rater Review Stand for Nextdoor",
        "Tap Rater Review Stand for Avvo",
        "Tap Rater Review Stand for Taskrabbit",
        "Tap Rater Review Stand for Martindale",
        "Tap Rater Review Stand for Justia",
        "Tap Rater Review Stand for FindLaw",
        "Tap Rater Review Stand for Lawyers.com",
        "Tap Rater Review Stand for Zillow",
        "Tap Rater Review Stand for Realtor.com",
        "Tap Rater Review Stand for Homes.com",
        "Tap Rater Review Stand for Fresha",
        "Tap Rater Review Stand for Booksy",
        "Tap Rater Review Stand for StyleSeat",
        "Tap Rater Review Stand for Vagaro",
        "Tap Rater Review Stand for Apartments.com",
        "Tap Rater Review Stand for Trulia",
        "Tap Rater Review Stand for HomeAdvisor",
        "Tap Rater Review Stand for Thumbtack",
        "Tap Rater Review Stand for Houzz",
        "Tap Rater Review Stand for Porch",
        "Tap Rater Review Stand for Airbnb",
        "Tap Rater Review Stand for Agoda",
        "Tap Rater Review Stand for Vrbo",
        "Tap Rater Review Stand for Hotels.com",
        "Tap Rater Review Stand for Healthgrades",
        "Tap Rater Review Stand for Vitals",
        "Tap Rater Review Stand for Zocdoc",
        "Tap Rater Review Stand for RateMDs",
        "Tap Rater Review Stand for CareDash",
        "Tap Rater Review Stand for Opencare",
        "Tap Rater Rate Your Experience Stand",
        "Tap Rater Follow Us on Social Media Stand",
        "Tap Rater Follow Stand for Facebook",
        "Tap Rater Follow Stand for Instagram",
        "Tap Rater Follow Stand for TikTok",
        "Tap Rater Channel Stand for YouTube",
        "Tap Rater Follow Stand for LinkedIn",
        "Tap Rater Follow Stand for X",
        "Tap Rater Follow Stand for Snapchat",
        "Tap Rater Follow Stand for Pinterest",
        "Tap Rater Message Stand for WhatsApp",
        "Tap Rater Message Stand for Telegram",
        "Tap Rater Book Your Next Visit Stand",
        "Tap Rater Menu & Ordering Stand",
        "Tap Rater View Our Menu Stand",
        "Tap Rater Patient Resources Stand",
        "Tap Rater Check Our Information Stand",
        "Tap Rater Explore Our Services Stand",
        "Tap Rater Connect With Us Stand",
        "Tap Rater Visit Our Website Stand",
        "Tap Rater Custom Stand"
      ])
    );
    expect(titles).not.toContain("Multi-Link Stand");
    expect(titles).not.toContain("Custom Direct Stand");
    expect(titles.some((title) => title.includes("Plate"))).toBe(false);
    expect(titles).not.toContain("Google Review NFC Card");
    expect(titles).not.toContain("Employee Review Name Tag");
    expect(titles).not.toContain("Staff Review Tracking Page");
    expect(titles).not.toContain("Business Review Starter Kit");
  });

  it("keeps menu products menu-only", () => {
    const menuProducts = getActiveProducts().filter((product) => product.slug.includes("menu"));

    expect(menuProducts).toHaveLength(2);
    expect(JSON.stringify(menuProducts)).not.toMatch(/wifi/i);
  });

  it("keeps product and category copy compliant with review platform rules", () => {
    const copy = JSON.stringify({
      categories: getCatalogCategories(),
      products: getActiveProducts()
    });

    expect(copy).not.toMatch(/get 5-star reviews/i);
    expect(copy).not.toMatch(/only ask happy customers/i);
    expect(copy).not.toMatch(/reward customers for reviews/i);
    expect(copy).not.toMatch(/happy customers/i);
    expect(copy).not.toMatch(/satisfied customers/i);
  });
});
