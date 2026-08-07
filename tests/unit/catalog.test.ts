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
      "Website & Link Stands",
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
      includedServiceLabel: "Free basic activation",
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
    // Hosted Multi-Link Stand is excluded from the "regular" assumption for
    // the same reason Custom Direct Stand is: it doesn't have a standard/
    // platform-locked version at all -- it always shows the customer's own
    // hosted page, so it's branded by definition (text_action_branded), not
    // a standard+branded pair like the review/action stands.
    const regularProducts = products.filter((product) => !["custom-direct-stand", "hosted-multi-link-stand"].includes(product.slug));
    const customProduct = getProductBySlug("custom-direct-stand");

    expect(regularProducts.every((product) => product.customizationOptions.includes("standard_design"))).toBe(true);
    expect(regularProducts.every((product) => product.customizationOptions.includes("add_logo"))).toBe(true);
    expect(regularProducts.every((product) => !product.customizationOptions.includes("custom_design"))).toBe(true);
    expect(customProduct?.customizationOptions).toEqual(["custom_design"]);
    expect(customProduct?.allowsCustomDesign).toBe(true);
  });

  it("groups active launch stands by customer use case", () => {
    const reviewProducts = getProductsByCategory("reviews");
    const socialProducts = getProductsByCategory("social-media");
    const appointmentProducts = getProductsByCategory("appointments");
    const menuProducts = getProductsByCategory("menu");
    const feedbackProducts = getProductsByCategory("feedback");
    const websiteProducts = getProductsByCategory("website-links");
    const customProducts = getProductsByCategory("custom-stands");

    expect(reviewProducts).toHaveLength(24);
    expect(socialProducts).toHaveLength(2);
    expect(appointmentProducts).toHaveLength(2);
    expect(menuProducts).toHaveLength(2);
    expect(feedbackProducts).toHaveLength(2);
    expect(websiteProducts).toHaveLength(3);
    expect(customProducts).toHaveLength(1);
    expect(reviewProducts.filter((product) => product.format === "stand")).toHaveLength(24);
    expect(getActiveProducts().every((product) => product.format === "stand")).toBe(true);
  });

  it("includes only the launch stand catalog as active storefront products", () => {
    const products = getActiveProducts();
    const titles = products.map((product) => product.title);

    expect(products).toHaveLength(36);
    // Representative sample across both tiers and both original + newly
    // added platforms, not an exhaustive list -- keeps this test
    // maintainable as the catalog keeps growing through later phases.
    expect(titles).toEqual(
      expect.arrayContaining([
        "Google Review Stand",
        "Google Review Stand - Branded + QR",
        "Custom Direct Stand",
        "Hosted Multi-Link Stand",
        "Cars.com Review Stand",
        "BBB Review Stand",
        "Nextdoor Review Stand - Branded + QR"
      ])
    );
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
