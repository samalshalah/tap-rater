import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getCategoryBySlug, getProductBySlug } from "@/lib/products";

type ProductQueryResult = PromiseLike<{ data: unknown[] | null; error: null | { message: string } }>;
type ProductSingleQueryResult<T = unknown> = PromiseLike<{ data: T | null; error: null | { message: string } }>;
type ProductQueryBuilder = ProductQueryResult & {
  eq: (column: string, value: unknown) => ProductQueryBuilder;
  limit: (limit: number) => ProductQueryBuilder;
  maybeSingle: <T = unknown>() => ProductSingleQueryResult<T>;
};

export type ProductRepositoryClient = {
  from: (table: string) => {
    select: (columns?: string) => ProductQueryBuilder;
  };
};

type ProductRow = Record<string, unknown>;
const STOREFRONT_PRODUCT_CACHE_MS = 60_000;

type StorefrontCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const productBySlugCache = new Map<string, StorefrontCacheEntry<MigratedProduct | undefined>>();
const categoryProductsCache = new Map<string, StorefrontCacheEntry<MigratedProduct[]>>();
const STOREFRONT_PRODUCT_COLUMNS = [
  "slug",
  "title",
  "sku",
  "category_slug",
  "stand_type_slug",
  "primary_platform_slug",
  "destination_type",
  "is_special_solution",
  "product_kind",
  "status",
  "format",
  "base_price_cents",
  "sale_price_cents",
  "stock_status",
  "short_description",
  "description",
  "product_type",
  "service_mode",
  "checkout_mode",
  "requires_account",
  "requires_subscription",
  "requires_landing_page",
  "supported_destinations",
  "activation_type",
  "included_service_label",
  "customization_options",
  "allows_logo_upload",
  "allows_custom_design",
  "design_mode",
  "images",
  "standard_angled_image_url",
  "branded_angled_image_url",
  "multilink_angled_image_url",
  "standard_front_template_url",
  "branded_front_template_url",
  "multilink_front_template_url",
  "center_asset_url",
  "default_cta_text",
  "cta_editable",
  "landing_page_preview_config",
  "asset_readiness_status",
  "is_active",
  "seo_title",
  "seo_description"
].join(",");

export function staticStorefrontProducts(): MigratedProduct[] {
  return migratedProducts.filter((product) => product.isActive);
}

export async function getStorefrontProducts(): Promise<MigratedProduct[]> {
  noStore();

  if (!hasSupabaseAdminConfig()) {
    return staticStorefrontProducts();
  }

  try {
    return await getStorefrontProductsFromClient(getSupabaseAdmin() as ProductRepositoryClient);
  } catch {
    return staticStorefrontProducts();
  }
}

export const getStorefrontProductBySlug = cache(async (slug: string): Promise<MigratedProduct | undefined> => {
  if (!hasSupabaseAdminConfig()) {
    return getStaticStorefrontProductBySlug(slug);
  }

  try {
    const cachedProduct = readCache(productBySlugCache, slug);
    if (cachedProduct !== undefined) {
      return cachedProduct;
    }

    const product = await getStorefrontProductBySlugFromClient(getSupabaseAdmin() as ProductRepositoryClient, slug);
    writeCache(productBySlugCache, slug, product);
    return product;
  } catch {
    return getStaticStorefrontProductBySlug(slug);
  }
});

export async function getStorefrontProductsByCategory(slug: string): Promise<MigratedProduct[]> {
  const products = await getStorefrontProducts();
  const categorySlug = getCategoryBySlug(slug)?.slug ?? slug;

  return products.filter((product) => product.categorySlug === categorySlug && product.isActive);
}

export function getStorefrontRelatedProducts(product: MigratedProduct, products: MigratedProduct[], limit = 3): MigratedProduct[] {
  const sameCategory = products.filter(
    (item) => item.slug !== product.slug && item.categorySlug === product.categorySlug && item.isActive && item.stockStatus === "instock"
  );

  return sameCategory.slice(0, limit);
}

export async function getStorefrontProductBySlugFromClient(
  client: ProductRepositoryClient,
  slug: string
): Promise<MigratedProduct | undefined> {
  const { data, error } = await client
    .from("products")
    .select(STOREFRONT_PRODUCT_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<ProductRow>();

  if (error) {
    throw new Error(error.message);
  }

  const product = normalizeStorefrontProductRow(data);

  return product?.isActive ? product : undefined;
}

export async function getRelatedStorefrontProductsForProduct(product: MigratedProduct, limit = 3): Promise<MigratedProduct[]> {
  if (!hasSupabaseAdminConfig()) {
    return getStorefrontRelatedProducts(product, staticStorefrontProducts(), limit);
  }

  try {
    const fetchLimit = Math.max(limit + 4, 8);
    const cacheKey = `${product.categorySlug}:${fetchLimit}`;
    const cachedCategoryProducts = readCache(categoryProductsCache, cacheKey);
    const categoryProducts =
      cachedCategoryProducts ??
      (await getStorefrontProductsByCategoryFromClient(getSupabaseAdmin() as ProductRepositoryClient, product.categorySlug, fetchLimit));

    if (!cachedCategoryProducts) {
      writeCache(categoryProductsCache, cacheKey, categoryProducts);
    }

    return getStorefrontRelatedProducts(product, categoryProducts, limit);
  } catch {
    return getStorefrontRelatedProducts(product, staticStorefrontProducts(), limit);
  }
}

export async function getStorefrontRelatedProductsFromClient(
  client: ProductRepositoryClient,
  product: MigratedProduct,
  limit = 3
): Promise<MigratedProduct[]> {
  const categoryProducts = await getStorefrontProductsByCategoryFromClient(client, product.categorySlug, limit + 4);

  return getStorefrontRelatedProducts(product, categoryProducts, limit);
}

export async function getStorefrontProductsByCategoryFromClient(
  client: ProductRepositoryClient,
  categorySlug: string,
  limit = 8
): Promise<MigratedProduct[]> {
  const { data, error } = await client
    .from("products")
    .select(STOREFRONT_PRODUCT_COLUMNS)
    .eq("is_active", true)
    .eq("category_slug", categorySlug)
    .eq("stock_status", "instock")
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => normalizeStorefrontProductRow(row))
    .filter((item): item is MigratedProduct => Boolean(item?.isActive && item.stockStatus === "instock"))
    .slice(0, limit);
}

export async function getStorefrontProductsFromClient(client: ProductRepositoryClient): Promise<MigratedProduct[]> {
  const { data, error } = await client.from("products").select(STOREFRONT_PRODUCT_COLUMNS).eq("is_active", true);

  if (error || !data) {
    return staticStorefrontProducts();
  }

  const products = data
    .map((row) => normalizeStorefrontProductRow(row))
    .filter((product): product is MigratedProduct => Boolean(product?.isActive));

  primeStorefrontProductCaches(products);

  return products;
}

function getStaticStorefrontProductBySlug(slug: string) {
  const product = getProductBySlug(slug);

  return product?.isActive ? product : undefined;
}

function readCache<T>(cacheStore: Map<string, StorefrontCacheEntry<T>>, key: string): T | undefined {
  const entry = cacheStore.get(key);
  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return undefined;
  }

  return entry.value;
}

function writeCache<T>(cacheStore: Map<string, StorefrontCacheEntry<T>>, key: string, value: T) {
  if (cacheStore.size > 256) {
    cacheStore.clear();
  }

  cacheStore.set(key, {
    expiresAt: Date.now() + STOREFRONT_PRODUCT_CACHE_MS,
    value
  });
}

function primeStorefrontProductCaches(products: MigratedProduct[]) {
  const byCategory = new Map<string, MigratedProduct[]>();

  for (const product of products) {
    writeCache(productBySlugCache, product.slug, product);

    if (product.stockStatus !== "instock") {
      continue;
    }

    const categoryProducts = byCategory.get(product.categorySlug) ?? [];
    categoryProducts.push(product);
    byCategory.set(product.categorySlug, categoryProducts);
  }

  for (const [categorySlug, categoryProducts] of byCategory) {
    writeCache(categoryProductsCache, `${categorySlug}:8`, categoryProducts);
  }
}

export function normalizeStorefrontProductRow(row: unknown): MigratedProduct | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const productRow = row as ProductRow;
  const slug = readString(productRow.slug);
  const staticProduct = slug ? getProductBySlug(slug) : undefined;
  const title = readString(productRow.title) ?? staticProduct?.title;
  const sku = readString(productRow.sku) ?? staticProduct?.sku ?? slug?.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  const rawCategorySlug =
    readString(productRow.category_slug) ??
    readString(productRow.categorySlug) ??
    readString(productRow.stand_category_slug) ??
    readString(productRow.standCategorySlug) ??
    staticProduct?.categorySlug;
  const standTypeSlug = readString(productRow.stand_type_slug) ?? readString(productRow.standTypeSlug) ?? staticProduct?.standTypeSlug;
  const primaryPlatformSlug =
    readString(productRow.primary_platform_slug) ?? readString(productRow.primaryPlatformSlug) ?? staticProduct?.primaryPlatformSlug;
  const destinationType = readString(productRow.destination_type) ?? readString(productRow.destinationType) ?? staticProduct?.destinationType;
  const businessUseSlugs =
    readStringArray(productRow.business_use_slugs) ?? readStringArray(productRow.businessUseSlugs) ?? staticProduct?.businessUseSlugs;
  const isSpecialSolution =
    readBoolean(productRow.is_special_solution) ?? readBoolean(productRow.isSpecialSolution) ?? staticProduct?.isSpecialSolution ?? false;
  const productKind = readProductKind(productRow.product_kind) ?? readProductKind(productRow.productKind) ?? staticProduct?.productKind;
  const status = readProductStatus(productRow.status) ?? staticProduct?.status;
  const matchedCategory = rawCategorySlug ? getCategoryBySlug(rawCategorySlug) : undefined;
  const categorySlug = matchedCategory?.slug === rawCategorySlug ? rawCategorySlug : staticProduct?.categorySlug ?? matchedCategory?.slug ?? rawCategorySlug;
  const basePriceCents = readNumber(productRow.base_price_cents) ?? readNumber(productRow.basePriceCents) ?? staticProduct?.basePriceCents ?? 3900;
  const stockStatus = readStockStatus(productRow.stock_status) ?? readStockStatus(productRow.stockStatus) ?? staticProduct?.stockStatus ?? "instock";
  const shortDescription =
    readString(productRow.short_description) ?? readString(productRow.shortDescription) ?? staticProduct?.shortDescription ?? `${title} NFC and QR stand.`;
  const description = readString(productRow.description) ?? staticProduct?.description ?? shortDescription;
  const productType =
    readProductType(productRow.product_type) ?? readProductType(productRow.productType) ?? staticProduct?.productType ?? "physical_redirect";
  const serviceMode = readServiceMode(productRow.service_mode) ?? readServiceMode(productRow.serviceMode) ?? staticProduct?.serviceMode ?? "basic_redirect";
  const checkoutMode = readCheckoutMode(productRow.checkout_mode) ?? readCheckoutMode(productRow.checkoutMode) ?? staticProduct?.checkoutMode ?? "buy_now";
  const requiresAccount =
    readBoolean(productRow.requires_account) ?? readBoolean(productRow.requiresAccount) ?? staticProduct?.requiresAccount ?? false;
  const requiresSubscription =
    readBoolean(productRow.requires_subscription) ?? readBoolean(productRow.requiresSubscription) ?? staticProduct?.requiresSubscription ?? false;
  const requiresLandingPage =
    readBoolean(productRow.requires_landing_page) ?? readBoolean(productRow.requiresLandingPage) ?? staticProduct?.requiresLandingPage ?? false;
  const supportedDestinations =
    readSupportedDestinations(productRow.supported_destinations) ??
    readSupportedDestinations(productRow.supportedDestinations) ??
    staticProduct?.supportedDestinations ??
    ["custom"];
  const activationType =
    readActivationType(productRow.activation_type) ?? readActivationType(productRow.activationType) ?? staticProduct?.activationType ?? "free_basic_activation";
  const includedServiceLabel =
    readString(productRow.included_service_label) ?? readString(productRow.includedServiceLabel) ?? staticProduct?.includedServiceLabel ?? "Free basic activation";
  const format =
    readProductFormat(productRow.format) ??
    readProductFormat(productRow.product_format) ??
    staticProduct?.format ??
    inferProductFormatFromTitle(title);
  const customizationOptions =
    readCustomizationOptions(productRow.customization_options) ??
    readCustomizationOptions(productRow.customizationOptions) ??
    staticProduct?.customizationOptions ??
    ["standard_design"];
  const allowsLogoUpload =
    readBoolean(productRow.allows_logo_upload) ??
    readBoolean(productRow.allowsLogoUpload) ??
    staticProduct?.allowsLogoUpload ??
    customizationOptions.includes("add_logo");
  const allowsCustomDesign =
    readBoolean(productRow.allows_custom_design) ??
    readBoolean(productRow.allowsCustomDesign) ??
    staticProduct?.allowsCustomDesign ??
    customizationOptions.includes("custom_design");
  const designMode = readDesignMode(productRow.design_mode) ?? readDesignMode(productRow.designMode) ?? staticProduct?.designMode ?? "standard";
  const displayText = readString(productRow.display_text) ?? readString(productRow.displayText) ?? staticProduct?.displayText;
  const assetSet = {
    standardAngledImageUrl:
      readString(productRow.standard_angled_image_url) ?? readString(productRow.standardAngledImageUrl) ?? staticProduct?.assetSet?.standardAngledImageUrl,
    brandedAngledImageUrl:
      readString(productRow.branded_angled_image_url) ?? readString(productRow.brandedAngledImageUrl) ?? staticProduct?.assetSet?.brandedAngledImageUrl,
    multiLinkAngledImageUrl:
      readString(productRow.multilink_angled_image_url) ??
      readString(productRow.multiLinkAngledImageUrl) ??
      staticProduct?.assetSet?.multiLinkAngledImageUrl,
    standardFrontTemplateUrl:
      readString(productRow.standard_front_template_url) ?? readString(productRow.standardFrontTemplateUrl) ?? staticProduct?.assetSet?.standardFrontTemplateUrl,
    brandedFrontTemplateUrl:
      readString(productRow.branded_front_template_url) ?? readString(productRow.brandedFrontTemplateUrl) ?? staticProduct?.assetSet?.brandedFrontTemplateUrl,
    multiLinkFrontTemplateUrl:
      readString(productRow.multilink_front_template_url) ??
      readString(productRow.multiLinkFrontTemplateUrl) ??
      staticProduct?.assetSet?.multiLinkFrontTemplateUrl,
    centerAssetUrl: readString(productRow.center_asset_url) ?? readString(productRow.centerAssetUrl) ?? staticProduct?.assetSet?.centerAssetUrl,
    landingPagePreviewConfig:
      readRecord(productRow.landing_page_preview_config) ??
      readRecord(productRow.landingPagePreviewConfig) ??
      staticProduct?.assetSet?.landingPagePreviewConfig
  };
  const defaultCtaText = readString(productRow.default_cta_text) ?? readString(productRow.defaultCtaText) ?? staticProduct?.defaultCtaText;
  const ctaEditable = readBoolean(productRow.cta_editable) ?? readBoolean(productRow.ctaEditable) ?? staticProduct?.ctaEditable;
  const assetReadinessStatus =
    readAssetReadinessStatus(productRow.asset_readiness_status) ??
    readAssetReadinessStatus(productRow.assetReadinessStatus) ??
    staticProduct?.assetReadinessStatus;

  if (
    !slug ||
    !title ||
    !sku ||
    !categorySlug ||
    basePriceCents === undefined ||
    !stockStatus ||
    !shortDescription ||
    !description ||
    !format ||
    customizationOptions.length === 0 ||
    !designMode
  ) {
    return null;
  }

  return {
    slug,
    title,
    sku,
    categorySlug: categorySlug as MigratedProduct["categorySlug"],
    standTypeSlug,
    primaryPlatformSlug,
    destinationType,
    businessUseSlugs,
    isSpecialSolution,
    productKind,
    status,
    basePriceCents,
    salePriceCents: readNumber(productRow.sale_price_cents) ?? readNumber(productRow.salePriceCents),
    stockStatus,
    shortDescription,
    description,
    productType,
    serviceMode,
    checkoutMode,
    requiresAccount,
    requiresSubscription,
    requiresLandingPage,
    supportedDestinations,
    activationType,
    includedServiceLabel,
    format,
    customizationOptions,
    allowsLogoUpload,
    allowsCustomDesign,
    designMode,
    displayText,
    assetSet,
    defaultCtaText,
    ctaEditable,
    assetReadinessStatus,
    images: readImages(productRow.images) ?? staticProduct?.images ?? [],
    variants: readVariants(productRow.variants) ?? staticProduct?.variants ?? [],
    isActive: readBoolean(productRow.is_active) ?? readBoolean(productRow.isActive) ?? true,
    seoTitle: readString(productRow.seo_title) ?? readString(productRow.seoTitle) ?? staticProduct?.seoTitle,
    seoDescription: readString(productRow.seo_description) ?? readString(productRow.seoDescription) ?? staticProduct?.seoDescription,
    searchKeywords:
      readStringArray(productRow.search_keywords) ?? readStringArray(productRow.searchKeywords) ?? staticProduct?.searchKeywords,
    updatedAt: readString(productRow.updated_at) ?? readString(productRow.updatedAt) ?? staticProduct?.updatedAt
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readStockStatus(value: unknown): MigratedProduct["stockStatus"] | undefined {
  return value === "instock" || value === "outofstock" ? value : undefined;
}

function readServiceMode(value: unknown): MigratedProduct["serviceMode"] | undefined {
  if (value === "premium_landing_page") {
    return "hosted_landing_page";
  }

  return value === "basic_redirect" || value === "managed_redirect" || value === "hosted_landing_page" || value === "multi_location_platform"
    ? value
    : undefined;
}

function readProductType(value: unknown): MigratedProduct["productType"] | undefined {
  return value === "physical_redirect" || value === "physical_managed" || value === "platform_landing_page" || value === "bundle"
    ? value
    : undefined;
}

function readCheckoutMode(value: unknown): MigratedProduct["checkoutMode"] | undefined {
  return value === "buy_now" || value === "request_quote" || value === "subscription" || value === "contact_sales" ? value : undefined;
}

function readSupportedDestinations(value: unknown): MigratedProduct["supportedDestinations"] | undefined {
  const destinations: MigratedProduct["supportedDestinations"][number][] = [
    "google",
    "facebook",
    "yelp",
    "tripadvisor",
    "trustpilot",
    "bbb",
    "nextdoor",
    "instagram",
    "tiktok",
    "linkedin",
    "x",
    "youtube",
    "vagaro",
    "booksy",
    "fresha",
    "zocdoc",
    "calendly",
    "acuity",
    "square-appointments",
    "custom-booking-url",
    "booking",
    "toast",
    "doordash",
    "ubereats",
    "grubhub",
    "opentable",
    "resy",
    "custom-menu-url",
    "website",
    "menu",
    "wifi",
    "feedback",
    "referral",
    "payment-url",
    "loyalty-url",
    "custom-url",
    "custom"
  ];

  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value.filter((item): item is MigratedProduct["supportedDestinations"][number] => {
    return destinations.includes(item as MigratedProduct["supportedDestinations"][number]);
  });
  return normalized.length > 0 ? normalized : undefined;
}

function readActivationType(value: unknown): MigratedProduct["activationType"] | undefined {
  return value === "free_basic_activation" || value === "managed_setup" || value === "premium_hosted_activation" ? value : undefined;
}

function readProductFormat(value: unknown): MigratedProduct["format"] | undefined {
  return value === "stand" || value === "plate" || value === "bundle" || value === "platform" ? value : undefined;
}

function readProductKind(value: unknown): MigratedProduct["productKind"] | undefined {
  return value === "normal_direct" || value === "custom_direct" || value === "hosted_multilink" || value === "bundle" ? value : undefined;
}

function readProductStatus(value: unknown): MigratedProduct["status"] | undefined {
  return value === "draft" || value === "active" || value === "archived" ? value : undefined;
}

function readAssetReadinessStatus(value: unknown): MigratedProduct["assetReadinessStatus"] | undefined {
  return value === "draft_missing_assets" || value === "ready" || value === "blocked" ? value : undefined;
}

function readCustomizationOptions(value: unknown): MigratedProduct["customizationOptions"] | undefined {
  const options: MigratedProduct["customizationOptions"][number][] = ["standard_design", "add_logo", "custom_design"];

  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value.filter((item): item is MigratedProduct["customizationOptions"][number] => {
    return options.includes(item as MigratedProduct["customizationOptions"][number]);
  });
  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

function readDesignMode(value: unknown): MigratedProduct["designMode"] | undefined {
  return value === "standard" || value === "logo" || value === "custom" ? value : undefined;
}

function inferProductFormatFromTitle(title: string | undefined): MigratedProduct["format"] | undefined {
  if (!title) {
    return undefined;
  }

  const normalized = title.toLowerCase();
  if (normalized.includes("plate")) return "plate";
  if (normalized.includes("bundle") || normalized.includes("kit")) return "bundle";
  if (normalized.includes("page") || normalized.includes("dashboard")) return "platform";
  return "stand";
}

function readStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readImages(value: unknown): MigratedProduct["images"] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const images = value.filter((item): item is { src: string; alt: string } => {
    return Boolean(
      item &&
        typeof item === "object" &&
        typeof (item as { src?: unknown }).src === "string" &&
        typeof (item as { alt?: unknown }).alt === "string"
    );
  });

  return images;
}

function readVariants(value: unknown): MigratedProduct["variants"] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const variants = value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const variant = item as { id?: unknown; label?: unknown; sku?: unknown; stockStatus?: unknown; stock_status?: unknown };
    const id = readString(variant.id);
    const label = readString(variant.label);
    const sku = readString(variant.sku);
    const stockStatus = readStockStatus(variant.stockStatus ?? variant.stock_status);

    return id && label && sku && stockStatus ? [{ id, label, sku, stockStatus }] : [];
  });

  return variants.length > 0 ? variants : undefined;
}
