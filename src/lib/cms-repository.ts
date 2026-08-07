import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import type { AdminConfigInput, HomepageContentInput, PageContentInput, ProductContentInput } from "@/lib/validators";

type UpsertResult = PromiseLike<{ error: null | { message: string } }>;
type SelectSingleResult<T> = PromiseLike<{ data: T | null; error: null | { message: string } }>;

export type CmsDbClient = {
  from: (table: string) => {
    upsert: (values: Record<string, unknown>) => UpsertResult;
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
      "Sell today with printed tabletop stands that open one direct link by tap or scan. Choose a standard stand, branded stand, or custom direct stand.",
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
    customization_options: input.customizationOptions,
    allows_logo_upload: input.allowsLogoUpload,
    allows_custom_design: input.allowsCustomDesign,
    design_mode: input.designMode,
    featured: input.featured,
    images: input.images,
    variants: input.variants,
    seo_title: input.seoTitle ?? null,
    seo_description: input.seoDescription ?? null,
    is_active: input.isActive,
    design_logic: input.designLogic,
    pricing_tier: input.pricingTier,
    use_case_slugs: input.useCaseSlugs,
    platform_slug: input.platformSlug ?? null,
    color_options: input.colorOptions ?? null,
    template_images: input.templateImages ?? null,
    provider_options: input.providerOptions ?? null
  });
}

async function upsertOrThrow(client: CmsDbClient, table: string, values: Record<string, unknown>) {
  const { error } = await client.from(table).upsert(values);

  if (error) {
    throw new Error(error.message);
  }
}
