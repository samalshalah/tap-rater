import { describe, expect, it } from "vitest";
import {
  getStorefrontProductsFromClient,
  normalizeStorefrontProductRow,
  staticStorefrontProducts
} from "@/lib/product-repository";

describe("product repository", () => {
  it("normalizes Supabase products into storefront product shape", () => {
    const product = normalizeStorefrontProductRow({
      slug: "google-review-stand",
      title: "Supabase Google Stand",
      sku: "SUP-1",
      category_slug: "review-stands",
      format: "stand",
      base_price_cents: 5900,
      sale_price_cents: null,
      stock_status: "instock",
      short_description: "Supabase short description",
      description: "Supabase full description",
      product_type: "physical_managed",
      service_mode: "managed_redirect",
      checkout_mode: "buy_now",
      requires_account: false,
      requires_subscription: false,
      requires_landing_page: false,
      supported_destinations: ["google", "custom"],
      activation_type: "managed_setup",
      included_service_label: "Managed setup included",
      customization_options: ["standard_design", "add_logo", "custom_design"],
      allows_logo_upload: true,
      allows_custom_design: true,
      design_mode: "logo",
      seo_title: "Supabase SEO",
      seo_description: "Supabase description",
      search_keywords: ["supabase", "google"],
      variants: [{ id: "white", label: "White", sku: "SUP-1-W", stock_status: "instock" }],
      is_active: true
    });

    if (!product) {
      throw new Error("Expected Supabase product row to normalize");
    }

    expect(product).toMatchObject({
      slug: "google-review-stand",
      title: "Supabase Google Stand",
      sku: "SUP-1",
      categorySlug: "reviews",
      basePriceCents: 5900,
      salePriceCents: undefined,
      stockStatus: "instock",
      shortDescription: "Supabase short description",
      description: "Supabase full description",
      productType: "physical_managed",
      serviceMode: "managed_redirect",
      checkoutMode: "buy_now",
      requiresAccount: false,
      requiresSubscription: false,
      requiresLandingPage: false,
      supportedDestinations: ["google", "custom"],
      activationType: "managed_setup",
      includedServiceLabel: "Managed setup included",
      format: "stand",
      customizationOptions: ["standard_design", "add_logo", "custom_design"],
      allowsLogoUpload: true,
      allowsCustomDesign: true,
      designMode: "logo",
      seoTitle: "Supabase SEO",
      seoDescription: "Supabase description",
      searchKeywords: ["supabase", "google"],
      isActive: true
    });
    expect(product.images.length).toBeGreaterThan(0);
    expect(product.variants[0]).toEqual({ id: "white", label: "White", sku: "SUP-1-W", stockStatus: "instock" });
  });

  it("merges a saved product OVER the static catalog by slug, rather than replacing the entire catalog with just the DB rows (critical safety fix)", async () => {
    const products = await getStorefrontProductsFromClient(
      mockProductsClient([
        {
          slug: "google-review-stand",
          title: "Edited Google Stand",
          sku: "SUP-1",
          category_slug: "reviews",
          format: "stand",
          base_price_cents: 5900,
          sale_price_cents: 4900,
          stock_status: "instock",
          short_description: "Edited short description",
          description: "Edited full description",
          product_type: "physical_redirect",
          service_mode: "basic_redirect",
          checkout_mode: "buy_now",
          requires_account: false,
          requires_subscription: false,
          requires_landing_page: false,
          supported_destinations: ["google"],
          activation_type: "free_basic_activation",
          included_service_label: "Free basic activation",
          customization_options: ["standard_design", "add_logo", "custom_design"],
          allows_logo_upload: true,
          allows_custom_design: true,
          design_mode: "standard",
          is_active: true
        }
      ])
    );

    // The whole catalog must still be there -- this is the exact scenario
    // that used to break: saving ONE product edit would previously replace
    // the entire storefront with just this one row.
    expect(products.length).toBe(staticStorefrontProducts().length);

    const edited = products.find((p) => p.slug === "google-review-stand");
    expect(edited?.title).toBe("Edited Google Stand");
    expect(edited?.salePriceCents).toBe(4900);

    // Every other product is untouched, still showing its rich static data.
    const untouched = products.find((p) => p.slug === "yelp-review-stand");
    expect(untouched?.title).toBe("Yelp Review Stand");
  });

  it("adds a genuinely new admin-created product (not in the static catalog) to the merged result -- it must not be silently dropped", async () => {
    const products = await getStorefrontProductsFromClient(
      mockProductsClient([
        {
          slug: "brand-new-admin-product",
          title: "Brand New Admin Product",
          sku: "NEW-1",
          category_slug: "reviews",
          format: "stand",
          base_price_cents: 4900,
          stock_status: "instock",
          short_description: "short",
          description: "long",
          product_type: "physical_redirect",
          service_mode: "basic_redirect",
          checkout_mode: "buy_now",
          requires_account: false,
          requires_subscription: false,
          requires_landing_page: false,
          supported_destinations: ["custom"],
          activation_type: "free_basic_activation",
          included_service_label: "Free basic activation",
          is_active: true
        }
      ])
    );

    expect(products.length).toBe(staticStorefrontProducts().length + 1);
    expect(products.some((p) => p.slug === "brand-new-admin-product" && p.title === "Brand New Admin Product")).toBe(true);
  });

  it("falls back to static products when the Supabase query fails", async () => {
    const products = await getStorefrontProductsFromClient(mockProductsClient(null, { message: "query failed" }));

    expect(products).toEqual(staticStorefrontProducts());
  });
});

function mockProductsClient(data: unknown[] | null, error: null | { message: string } = null) {
  return {
    from(table: string) {
      expect(table).toBe("products");

      return {
        select() {
          return {
            eq(column: string, value: boolean) {
              expect(column).toBe("is_active");
              expect(value).toBe(true);

              return Promise.resolve({ data, error });
            }
          };
        }
      };
    }
  };
}
