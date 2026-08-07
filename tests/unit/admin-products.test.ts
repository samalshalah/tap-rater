import { describe, expect, it } from "vitest";
import { createBlankAdminProduct } from "@/lib/admin-products";

describe("admin products", () => {
  it("creates a blank product draft for the admin create form", () => {
    const product = createBlankAdminProduct();

    expect(product).toMatchObject({
      slug: "",
      title: "",
      sku: "",
      categorySlug: "reviews",
      format: "stand",
      basePriceCents: 0,
      stockStatus: "instock",
      shortDescription: "",
      description: "",
      productType: "physical_redirect",
      serviceMode: "basic_redirect",
      checkoutMode: "buy_now",
      requiresAccount: false,
      requiresSubscription: false,
      requiresLandingPage: false,
      activationType: "free_basic_activation",
      includedServiceLabel: "Free basic activation",
      customizationOptions: ["standard_design", "add_logo", "custom_design"],
      allowsLogoUpload: true,
      allowsCustomDesign: true,
      designMode: "standard",
      featured: false,
      images: [],
      variants: [],
      isActive: false
    });
  });
});
