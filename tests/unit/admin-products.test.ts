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

  it("sorts backend products so active synced catalog rows are easy to find", async () => {
    const products = await getAdminProductsFromClient({
      from(table: string) {
        return {
          select() {
            if (table === "product_business_uses") {
              return Promise.resolve({ data: [], error: null });
            }

            return Promise.resolve({
              data: [
                productRow({ slug: "yelp-review-stand", title: "Yelp Review Stand", is_active: true, status: "active" }),
                productRow({ slug: "google-review-stand", title: "Google Review Stand", is_active: true, status: "active" }),
                productRow({ slug: "draft-product", title: "A Draft Product", is_active: false, status: "draft" }),
                productRow({ slug: "avvo-review-stand", title: "Avvo Review Stand", is_active: true, status: "active" })
              ],
              error: null
            });
          }
        };
      }
    });

    expect(products.map((product) => product.slug)).toEqual([
      "google-review-stand",
      "yelp-review-stand",
      "avvo-review-stand",
      "draft-product"
    ]);
  });
});

function productRow(overrides: Record<string, unknown>) {
  return {
    sku: String(overrides.slug ?? "product").toUpperCase(),
    category_slug: "reviews",
    stand_type_slug: "review-stands",
    primary_platform_slug: "custom-url",
    destination_type: "custom",
    is_special_solution: false,
    product_kind: "normal_direct",
    base_price_cents: 3900,
    stock_status: "instock",
    short_description: "Backend product",
    description: "Backend product",
    product_type: "physical_redirect",
    service_mode: "basic_redirect",
    checkout_mode: "buy_now",
    requires_account: false,
    requires_subscription: false,
    requires_landing_page: false,
    supported_destinations: ["custom"],
    activation_type: "free_basic_activation",
    included_service_label: "Free basic activation",
    format: "stand",
    customization_options: ["standard_design"],
    allows_logo_upload: false,
    allows_custom_design: false,
    design_mode: "standard",
    images: [],
    is_active: true,
    status: "active",
    ...overrides
  };
}
