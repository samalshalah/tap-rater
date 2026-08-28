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
      "Website & Link Stands"
    ]);
  });

  it("resolves a category by slug", () => {
    const category = getCategoryBySlug("custom-stands");

    expect(category?.title).toBe("Custom Stands");
    expect(category?.seoTitle).toContain("Custom NFC Stands");
  });

  it("filters active products by category", () => {
    const products = getProductsByCategory("reviews");

    expect(products.map((product) => product.title)).toContain("Google Review Stand");
    expect(products.map((product) => product.title)).not.toContain("Google Review Plate");
    expect(products.every((product) => product.categorySlug === "reviews")).toBe(true);
  });

  it("keeps old category slugs working as aliases", () => {
    const category = getCategoryBySlug("google-review-stands");
    const products = getProductsByCategory("google-review-stands");

    expect(category?.slug).toBe("reviews");
    expect(products.map((product) => product.title)).toContain("Google Review Stand");
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
      title: "Google Review Stand",
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

    expect(products.every((product) => product.customizationOptions.includes("standard_design"))).toBe(true);
    expect(products.every((product) => product.customizationOptions.includes("add_logo"))).toBe(true);
    expect(products.every((product) => !product.customizationOptions.includes("custom_design"))).toBe(true);
    expect(getProductBySlug("custom-direct-stand")).toBeUndefined();
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
    expect(menuProducts).toHaveLength(1);
    expect(feedbackProducts).toHaveLength(1);
    expect(websiteProducts).toHaveLength(1);
    expect(customProducts).toHaveLength(0);
    expect(reviewProducts.filter((product) => product.format === "stand")).toHaveLength(45);
    expect(getActiveProducts().every((product) => product.format === "stand")).toBe(true);
  });

  it("includes only the launch stand catalog as active storefront products", () => {
    const products = getActiveProducts();
    const titles = products.map((product) => product.title);

    expect(products).toHaveLength(60);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Google Review Stand",
        "Facebook Review Stand",
        "Yelp Review Stand",
        "TripAdvisor Review Stand",
        "Uber Eats Review Stand",
        "Angi Review Stand",
        "DealerRater Review Stand",
        "Autotrader Review Stand",
        "CARFAX Review Stand",
        "Edmunds Review Stand",
        "Cars.com Review Stand",
        "CarGurus Review Stand",
        "RepairPal Review Stand",
        "SureCritic Review Stand",
        "BBB Review Stand",
        "Nextdoor Review Stand",
        "Avvo Review Stand",
        "Taskrabbit Review Stand",
        "Martindale Review Stand",
        "Justia Review Stand",
        "FindLaw Review Stand",
        "Lawyers.com Review Stand",
        "Zillow Review Stand",
        "Realtor.com Review Stand",
        "Homes.com Review Stand",
        "Fresha Review Stand",
        "Booksy Review Stand",
        "StyleSeat Review Stand",
        "Vagaro Review Stand",
        "Apartments.com Review Stand",
        "Trulia Review Stand",
        "HomeAdvisor Review Stand",
        "Thumbtack Review Stand",
        "Houzz Review Stand",
        "Porch Review Stand",
        "Airbnb Review Stand",
        "Agoda Review Stand",
        "Vrbo Review Stand",
        "Hotels.com Review Stand",
        "Healthgrades Review Stand",
        "Vitals Review Stand",
        "Zocdoc Review Stand",
        "RateMDs Review Stand",
        "CareDash Review Stand",
        "Opencare Review Stand",
        "Rate Your Experience Stand",
        "Follow Us on Social Media Stand",
        "Facebook Follow Stand",
        "Instagram Follow Stand",
        "TikTok Follow Stand",
        "YouTube Follow Stand",
        "LinkedIn Follow Stand",
        "X Follow Stand",
        "Snapchat Follow Stand",
        "Pinterest Follow Stand",
        "WhatsApp Message Stand",
        "Telegram Message Stand",
        "Book Your Next Visit Stand",
        "View Our Menu Stand",
        "Visit Our Website Stand"
      ])
    );
    expect(titles).not.toContain("Custom Direct Stand");
    expect(titles.some((title) => title.includes("Plate"))).toBe(false);
    expect(titles).not.toContain("Google Review NFC Card");
    expect(titles).not.toContain("Employee Review Name Tag");
    expect(titles).not.toContain("Staff Review Tracking Page");
    expect(titles).not.toContain("Business Review Starter Kit");
  });

  it("keeps menu products menu-only", () => {
    const menuProducts = getActiveProducts().filter((product) => product.slug.includes("menu"));

    expect(menuProducts).toHaveLength(1);
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
