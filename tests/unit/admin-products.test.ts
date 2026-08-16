import { describe, expect, it } from "vitest";
import { createBlankAdminProduct, getAdminProductsFromClient } from "@/lib/admin-products";

describe("admin products", () => {
  it("creates a blank product draft for the admin create form", () => {
    const product = createBlankAdminProduct();

    expect(product).toMatchObject({
      slug: "",
      title: "",
      sku: "",
      categorySlug: "reviews",
      standTypeSlug: "review-stands",
      primaryPlatformSlug: "custom-url",
      destinationType: "custom",
      businessUseSlugs: [],
      isSpecialSolution: false,
      productKind: "normal_direct",
      status: "draft",
      format: "stand",
      basePriceCents: 3900,
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
      customizationOptions: ["standard_design", "add_logo"],
      allowsLogoUpload: true,
      allowsCustomDesign: false,
      designMode: "standard",
      assetSet: {},
      defaultCtaText: "",
      ctaEditable: true,
      assetReadinessStatus: "draft_missing_assets",
      images: [],
      variants: [],
      isActive: false
    });
  });

  it("keeps the admin catalog empty when the configured database has no products", async () => {
    const products = await getAdminProductsFromClient({
      from(table: string) {
        return {
          select() {
            expect(["products", "product_business_uses"]).toContain(table);
            return Promise.resolve({ data: [], error: null });
          }
        };
      }
    });

    expect(products).toEqual([]);
  });
});
