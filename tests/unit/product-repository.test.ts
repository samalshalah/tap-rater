import { describe, expect, it } from "vitest";
import {
  getStorefrontProductBySlugFromClient,
  getStorefrontProductsFromClient,
  getStorefrontRelatedProductsFromClient,
  normalizeStorefrontProductRow
} from "@/lib/product-repository";
import type { ProductRepositoryClient } from "@/lib/product-repository";

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

  it("attaches active backend product options to storefront products", async () => {
    const products = await getStorefrontProductsFromClient(mockProductsClient(
      [
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
          images: [{ src: "/uploads/products/google-review-stand.png", alt: "Database-only Google review stand" }],
          variants: [],
          is_active: true
        }
      ],
      null,
      createQueryCalls(),
      [
        {
          product_slug: "database-only-google-review-stand",
          option_code: "standard_direct",
          title: "Standard Direct",
          description: "Backend Standard Direct",
          price_cents: 4200,
          requires_destination_url: true,
          has_qr: false,
          requires_logo: false,
          requires_business_name: false,
          requires_design_step: false,
          requires_front_proof: false,
          requires_subscription: false,
          account_required: false,
          is_active: true,
          sort_order: 1
        }
      ]
    ));

    expect(products[0].purchaseOptions).toEqual([
      expect.objectContaining({
        optionCode: "standard_direct",
        title: "Standard Direct",
        priceCents: 4200,
        isActive: true
      })
    ]);
  });

  it("normalizes locked catalog organization and asset fields", () => {
    const product = normalizeStorefrontProductRow({
      slug: "database-google-review-stand",
      title: "Database Google Review Stand",
      sku: "DB-GOOGLE-ARCH",
      category_slug: "reviews",
      stand_type_slug: "review-stands",
      primary_platform_slug: "google",
      destination_type: "review",
      is_special_solution: false,
      product_kind: "normal_direct",
      status: "draft",
      format: "stand",
      base_price_cents: 3900,
      stock_status: "instock",
      short_description: "Database Google review stand",
      description: "A canonical Google Review Stand with architecture metadata.",
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
      standard_angled_image_url: "/uploads/products/google-review-stand.png",
      branded_angled_image_url: "/uploads/products/google-review-stand-branded.png",
      multilink_angled_image_url: null,
      branded_front_template_url: "/uploads/templates/google-branded-front.png",
      multilink_front_template_url: null,
      default_cta_text: "Review us on Google",
      cta_editable: false,
      asset_readiness_status: "draft_missing_assets",
      landing_page_preview_config: {},
      images: [{ src: "/uploads/products/google-review-stand.png", alt: "Google Review Stand" }],
      is_active: true
    });

    expect(product).toMatchObject({
      standTypeSlug: "review-stands",
      primaryPlatformSlug: "google",
      destinationType: "review",
      isSpecialSolution: false,
      productKind: "normal_direct",
      status: "draft",
      assetSet: {
        standardAngledImageUrl: "/uploads/products/google-review-stand.png",
        brandedAngledImageUrl: "/uploads/products/google-review-stand-branded.png",
        brandedFrontTemplateUrl: "/uploads/templates/google-branded-front.png"
      },
      defaultCtaText: "Review us on Google",
      ctaEditable: false,
      assetReadinessStatus: "draft_missing_assets"
    });
  });

  it("keeps sparse database-only products visible with launch-safe defaults", async () => {
    const products = await getStorefrontProductsFromClient(mockProductsClient([
      {
        slug: "book-appointment-stand",
        title: "Book Appointment Stand",
        stand_category_slug: "appointment-reservation-stands",
        format: "stand",
        base_price_cents: 3900,
        stock_status: "instock",
        is_active: true
      }
    ]));

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      slug: "book-appointment-stand",
      title: "Book Appointment Stand",
      sku: "BOOK-APPOINTMENT-STAND",
      categorySlug: "appointment-reservation-stands",
      serviceMode: "basic_redirect",
      checkoutMode: "buy_now",
      requiresSubscription: false,
      requiresLandingPage: false,
      activationType: "free_basic_activation",
      includedServiceLabel: "Free basic activation",
      customizationOptions: ["standard_design"],
      allowsLogoUpload: false,
      allowsCustomDesign: false,
      designMode: "standard"
    });
  });

  it("fetches a database product by slug without loading the full storefront catalog", async () => {
    const calls = createQueryCalls();
    const product = await getStorefrontProductBySlugFromClient(
      mockProductsClient(
        [
          {
            slug: "database-only-yelp-review-stand",
            title: "Database Only Yelp Review Stand",
            sku: "DB-YELP-1",
            category_slug: "reviews",
            format: "stand",
            base_price_cents: 3900,
            stock_status: "instock",
            short_description: "Database-only Yelp review stand",
            description: "A Yelp review stand managed only from the products table.",
            product_type: "physical_redirect",
            service_mode: "basic_redirect",
            checkout_mode: "buy_now",
            requires_account: false,
            requires_subscription: false,
            requires_landing_page: false,
            supported_destinations: ["yelp"],
            activation_type: "free_basic_activation",
            included_service_label: "Free basic activation",
            customization_options: ["standard_design", "add_logo"],
            allows_logo_upload: true,
            allows_custom_design: false,
            design_mode: "standard",
            images: [{ src: "/uploads/products/yelp-review-stand.png", alt: "Database-only Yelp review stand" }],
            variants: [],
            is_active: true
          }
        ],
        null,
        calls
      ),
      "database-only-yelp-review-stand"
    );

    expect(product?.slug).toBe("database-only-yelp-review-stand");
    expect(calls.filters).toEqual([
      { column: "slug", value: "database-only-yelp-review-stand" },
      { column: "is_active", value: true }
    ]);
    expect(calls.maybeSingleCalls).toBe(1);
    expect(calls.limits).toEqual([]);
  });

  it("fetches same-category related products with a database limit", async () => {
    const calls = createQueryCalls();
    const product = normalizeStorefrontProductRow({
      slug: "google-review-stand",
      title: "Google Review Stand",
      sku: "TR-GOOGLE-STAND",
      category_slug: "reviews",
      format: "stand",
      base_price_cents: 3900,
      stock_status: "instock",
      short_description: "Google review stand",
      description: "Google review stand",
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
      images: [{ src: "/uploads/products/google-review-stand.png", alt: "Google review stand" }],
      is_active: true
    });

    if (!product) {
      throw new Error("Expected product fixture to normalize");
    }

    const related = await getStorefrontRelatedProductsFromClient(
      mockProductsClient(
        [
          {
            slug: "google-review-stand",
            title: "Google Review Stand",
            sku: "TR-GOOGLE-STAND",
            category_slug: "reviews",
            format: "stand",
            base_price_cents: 3900,
            stock_status: "instock",
            short_description: "Google review stand",
            description: "Google review stand",
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
            is_active: true
          },
          {
            slug: "yelp-review-stand",
            title: "Yelp Review Stand",
            sku: "TR-YELP-STAND",
            category_slug: "reviews",
            format: "stand",
            base_price_cents: 3900,
            stock_status: "instock",
            short_description: "Yelp review stand",
            description: "Yelp review stand",
            product_type: "physical_redirect",
            service_mode: "basic_redirect",
            checkout_mode: "buy_now",
            requires_account: false,
            requires_subscription: false,
            requires_landing_page: false,
            supported_destinations: ["yelp"],
            activation_type: "free_basic_activation",
            included_service_label: "Free basic activation",
            customization_options: ["standard_design", "add_logo"],
            allows_logo_upload: true,
            allows_custom_design: false,
            design_mode: "standard",
            is_active: true
          },
          {
            slug: "facebook-review-stand",
            title: "Facebook Review Stand",
            sku: "TR-FACEBOOK-STAND",
            category_slug: "reviews",
            format: "stand",
            base_price_cents: 3900,
            stock_status: "outofstock",
            short_description: "Facebook review stand",
            description: "Facebook review stand",
            product_type: "physical_redirect",
            service_mode: "basic_redirect",
            checkout_mode: "buy_now",
            requires_account: false,
            requires_subscription: false,
            requires_landing_page: false,
            supported_destinations: ["facebook"],
            activation_type: "free_basic_activation",
            included_service_label: "Free basic activation",
            customization_options: ["standard_design", "add_logo"],
            allows_logo_upload: true,
            allows_custom_design: false,
            design_mode: "standard",
            is_active: true
          }
        ],
        null,
        calls
      ),
      product,
      3
    );

    expect(related.map((item) => item.slug)).toEqual(["yelp-review-stand"]);
    expect(calls.filters).toEqual([
      { column: "is_active", value: true },
      { column: "category_slug", value: "reviews" },
      { column: "stock_status", value: "instock" }
    ]);
    expect(calls.limits).toEqual([7]);
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

  it("fails closed instead of restoring static products when the configured product query fails", async () => {
    const products = await getStorefrontProductsFromClient(mockProductsClient(null, { message: "query failed" }));

    expect(products).toEqual([]);
  });
});

type QueryCalls = {
  filters: Array<{ column: string; value: unknown }>;
  limits: number[];
  maybeSingleCalls: number;
};

function createQueryCalls(): QueryCalls {
  return { filters: [], limits: [], maybeSingleCalls: 0 };
}

function mockProductsClient(
  data: unknown[] | null,
  error: null | { message: string } = null,
  calls = createQueryCalls(),
  productOptions: unknown[] = []
): ProductRepositoryClient {
  return {
    from(table: string) {
      return {
        select() {
          const builder = {
            eq(column: string, value: unknown) {
              if (table === "products") {
                calls.filters.push({ column, value });
              }
              return builder;
            },
            in() {
              return builder;
            },
            order() {
              return builder;
            },
            limit(limit: number) {
              if (table === "products") {
                calls.limits.push(limit);
              }
              return builder;
            },
            maybeSingle<T = unknown>() {
              calls.maybeSingleCalls += 1;
              return Promise.resolve({ data: (data?.[0] as T | undefined) ?? null, error });
            },
            then<TResult1 = { data: unknown[] | null; error: null | { message: string } }, TResult2 = never>(
              onfulfilled?: ((value: { data: unknown[] | null; error: null | { message: string } }) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
            ) {
              const tableData = table === "product_options" ? productOptions : data;
              const tableError = table === "products" ? error : null;
              return Promise.resolve({ data: tableData, error: tableError }).then(onfulfilled, onrejected);
            }
          } as ReturnType<ReturnType<ProductRepositoryClient["from"]>["select"]>;

          return builder;
        }
      };
    }
  };
}
