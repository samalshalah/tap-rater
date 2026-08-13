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

  it("prefers Supabase rows when the products query succeeds", async () => {
    const products = await getStorefrontProductsFromClient(mockProductsClient([
      {
        slug: "google-review-stand",
        title: "Supabase Google Stand",
        sku: "SUP-1",
        category_slug: "reviews",
        format: "stand",
        base_price_cents: 5900,
        sale_price_cents: 4900,
        stock_status: "instock",
        short_description: "Supabase short description",
        description: "Supabase full description",
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
      },
      {
        slug: "employee-review-name-tag",
        title: "Old active tag",
        sku: "OLD-TAG",
        category_slug: "reviews",
        format: "stand",
        base_price_cents: 5900,
        stock_status: "instock",
        short_description: "Old product",
        description: "Old product",
        product_type: "physical_managed",
        service_mode: "managed_redirect",
        checkout_mode: "request_quote",
        requires_account: false,
        requires_subscription: false,
        requires_landing_page: false,
        supported_destinations: ["google"],
        activation_type: "managed_setup",
        included_service_label: "Managed setup included",
        is_active: true
      }
    ]));

    expect(products).toHaveLength(2);
    expect(products[0].title).toBe("Supabase Google Stand");
    expect(products[0].salePriceCents).toBe(4900);
    expect(products[1].title).toBe("Old active tag");
  });

  it("returns active database-only products that are not in the legacy static catalog", async () => {
    const products = await getStorefrontProductsFromClient(mockProductsClient([
      {
        slug: "database-only-google-review-stand",
        title: "Database Only Google Review Stand",
        sku: "DB-GOOGLE-1",
        category_slug: "reviews",
        format: "stand",
        base_price_cents: 3900,
        stock_status: "instock",
        short_description: "Database-only Google review stand",
        description: "A Google review stand managed only from the products table.",
        product_type: "physical_redirect",
        service_mode: "basic_redirect",
        checkout_mode: "buy_now",
        requires_account: false,
        requires_subscription: false,
        requires_landing_page: false,
        supported_destinations: ["google"],
        activation_type: "free_basic_activation",
        included_service_label: "Free basic activation",
        customization_options: ["standard_design", "add_logo"],
        allows_logo_upload: true,
        allows_custom_design: false,
        design_mode: "standard",
        images: [{ src: "/uploads/products/v5/google-review-stand.png", alt: "Database-only Google review stand" }],
        variants: [],
        is_active: true
      }
    ]));

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      slug: "database-only-google-review-stand",
      title: "Database Only Google Review Stand",
      categorySlug: "reviews",
      basePriceCents: 3900,
      images: [{ src: "/uploads/products/v5/google-review-stand.png", alt: "Database-only Google review stand" }]
    });
  });

  it("keeps explicit empty database images instead of restoring static images", () => {
    const product = normalizeStorefrontProductRow({
      slug: "google-review-stand",
      title: "Supabase Google Stand",
      sku: "SUP-1",
      category_slug: "reviews",
      format: "stand",
      base_price_cents: 5900,
      stock_status: "instock",
      short_description: "Supabase short description",
      description: "Supabase full description",
      product_type: "physical_redirect",
      service_mode: "basic_redirect",
      checkout_mode: "buy_now",
      requires_account: false,
      requires_subscription: false,
      requires_landing_page: false,
      supported_destinations: ["google"],
      activation_type: "free_basic_activation",
      included_service_label: "Free basic activation",
      customization_options: ["standard_design", "add_logo"],
      allows_logo_upload: true,
      allows_custom_design: false,
      design_mode: "standard",
      images: [],
      is_active: true
    });

    expect(product?.images).toEqual([]);
  });

  it("returns an empty storefront when the configured database has no active products", async () => {
    const products = await getStorefrontProductsFromClient(mockProductsClient([]));

    expect(products).toEqual([]);
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
