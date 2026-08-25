import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import type { AdminConfigInput, HomepageContentInput, PageContentInput, ProductContentInput } from "@/lib/validators";

type MutationResult = PromiseLike<{ error: null | { message: string } }>;
type UpsertResult = MutationResult;
type SelectSingleResult<T> = PromiseLike<{ data: T | null; error: null | { message: string } }>;
type DeleteResult<T> = PromiseLike<{ data: T[] | null; error: null | { message: string } }>;

export type CmsDbClient = {
  from: (table: string) => {
    upsert: (values: Record<string, unknown> | Record<string, unknown>[], options?: Record<string, unknown>) => UpsertResult;
    insert: (values: Record<string, unknown> | Record<string, unknown>[]) => MutationResult;
    delete: () => {
      eq: (column: string, value: string) => MutationResult;
      in: (column: string, values: string[]) => {
        select: <T = unknown>(columns?: string) => DeleteResult<T>;
      };
    };
    select: (columns?: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: <T = { payload?: unknown }>() => SelectSingleResult<T>;
      };
    };
  };
};

export function getDefaultHomepageContent(): HomepageContentInput {
  return {
    eyebrow: "Tap Rater for local businesses",
    heroTitle: "NFC & QR stands for reviews, menus, booking, social media and more.",
    heroDescription:
      "Sell today with tabletop stands that open one direct link by tap or scan. Standard Direct is ready for checkout.",
    primaryButtonLabel: "Shop Stands",
    primaryButtonHref: "/shop",
    secondaryButtonLabel: "Create Custom Stand",
    secondaryButtonHref: "/custom-stands",
    featuredBadge: "Launch products",
    featuredLabel: "Physical stands"
  };
}

export async function getHomepageContent(): Promise<HomepageContentInput> {
  noStore();

  if (!hasSupabaseAdminConfig()) {
    return getDefaultHomepageContent();
  }

  const result = await (getSupabaseAdmin() as CmsDbClient)
    .from("site_content")
    .select("payload")
    .eq("key", "homepage")
    .maybeSingle<{ payload?: HomepageContentInput }>();

  return result.data?.payload ?? getDefaultHomepageContent();
}

export async function saveHomepageContent(client: CmsDbClient, input: HomepageContentInput) {
  await upsertOrThrow(client, "site_content", {
    key: "homepage",
    type: "homepage",
    status: "published",
    payload: input
  });
}

export async function savePageContent(client: CmsDbClient, input: PageContentInput) {
  await upsertOrThrow(client, "site_content", {
    key: `page:${input.slug}`,
    type: "page",
    status: input.status,
    payload: input
  });
}

export async function saveAdminConfig(client: CmsDbClient, input: AdminConfigInput) {
  await upsertOrThrow(client, "site_content", {
    key: `admin:${input.area}`,
    type: "section",
    status: input.status,
    payload: input
  });
}

export async function saveProductContent(client: CmsDbClient, input: ProductContentInput) {
  await upsertOrThrow(client, "products", {
    slug: input.slug,
    title: input.title,
    sku: input.sku,
    category_slug: input.categorySlug,
    stand_type_slug: input.standTypeSlug ?? null,
    primary_platform_slug: input.primaryPlatformSlug ?? null,
    destination_type: input.destinationType ?? null,
    is_special_solution: input.isSpecialSolution,
    product_kind: input.productKind,
    status: input.status,
    base_price_cents: input.basePriceCents,
    sale_price_cents: input.salePriceCents ?? null,
    stock_status: input.stockStatus,
    short_description: input.shortDescription,
    description: input.description,
    product_type: input.productType,
    service_mode: input.serviceMode,
    checkout_mode: input.checkoutMode,
    requires_account: input.requiresAccount,
    requires_subscription: input.requiresSubscription,
    requires_landing_page: input.requiresLandingPage,
    supported_destinations: input.supportedDestinations,
    activation_type: input.activationType,
    included_service_label: input.includedServiceLabel,
    format: input.format,
    customization_options: input.customizationOptions,
    allows_logo_upload: input.allowsLogoUpload,
    allows_custom_design: input.allowsCustomDesign,
    design_mode: input.designMode,
    images: input.images,
    standard_angled_image_url: input.assetSet.standardAngledImageUrl ?? null,
    branded_angled_image_url: input.assetSet.brandedAngledImageUrl ?? null,
    multilink_angled_image_url: input.assetSet.multiLinkAngledImageUrl ?? null,
    standard_front_template_url: input.assetSet.standardFrontTemplateUrl ?? null,
    branded_front_template_url: input.assetSet.brandedFrontTemplateUrl ?? null,
    multilink_front_template_url: input.assetSet.multiLinkFrontTemplateUrl ?? null,
    center_asset_url: input.assetSet.centerAssetUrl ?? null,
    default_cta_text: input.defaultCtaText ?? null,
    cta_editable: input.ctaEditable,
    landing_page_preview_config: input.assetSet.landingPagePreviewConfig ?? {},
    asset_readiness_status: input.assetReadinessStatus,
    seo_title: input.seoTitle ?? null,
    seo_description: input.seoDescription ?? null,
    is_active: input.isActive,
    updated_at: new Date().toISOString()
  });

  await replaceProductBusinessUses(client, input.slug, input.businessUseSlugs);
  await saveProductOptions(client, input.slug, input.productOptions);
}

export async function deleteProductContentBySlugs(client: CmsDbClient, slugs: string[]) {
  const { data, error } = await client
    .from("products")
    .delete()
    .in("slug", slugs)
    .select<{ slug: string }>("slug");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.slug);
}

async function upsertOrThrow(client: CmsDbClient, table: string, values: Record<string, unknown>) {
  const { error } = await client.from(table).upsert(values);

  if (error) {
    throw new Error(error.message);
  }
}

async function replaceProductBusinessUses(client: CmsDbClient, productSlug: string, businessUseSlugs: string[]) {
  const deleteResult = await client.from("product_business_uses").delete().eq("product_slug", productSlug);
  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  if (businessUseSlugs.length === 0) {
    return;
  }

  const rows = Array.from(new Set(businessUseSlugs)).map((businessUseSlug, index) => ({
    product_slug: productSlug,
    business_use_slug: businessUseSlug,
    sort_order: (index + 1) * 10
  }));
  const insertResult = await client.from("product_business_uses").insert(rows);

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
}

async function saveProductOptions(client: CmsDbClient, productSlug: string, productOptions: ProductContentInput["productOptions"]) {
  if (productOptions.length === 0) {
    return;
  }

  const rows = productOptions.map((option) => ({
    product_slug: productSlug,
    option_code: option.optionCode,
    title: option.title,
    description: option.description,
    price_cents: option.priceCents,
    monthly_price_cents: option.monthlyPriceCents ?? null,
    max_links: option.maxLinks ?? null,
    requires_destination_url: option.requiresDestinationUrl,
    has_qr: option.hasQr,
    requires_logo: option.requiresLogo,
    requires_business_name: option.requiresBusinessName,
    requires_design_step: option.requiresDesignStep,
    requires_front_proof: option.requiresFrontProof,
    requires_subscription: option.requiresSubscription,
    account_required: option.accountRequired,
    supports_reorderable_links: option.supportsReorderableLinks,
    supports_link_visibility: option.supportsLinkVisibility,
    landing_page_url_pattern: option.landingPageUrlPattern ?? null,
    footer_label: option.footerLabel ?? null,
    is_active: option.isActive,
    sort_order: option.sortOrder
  }));

  const result = await client.from("product_options").upsert(rows, { onConflict: "product_slug,option_code" });

  if (result.error) {
    throw new Error(result.error.message);
  }
}
