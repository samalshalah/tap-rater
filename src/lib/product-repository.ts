import {normalizeStorefrontProductRow} from './product-row-normalizer';
export {normalizeStorefrontProductRow} from './product-row-normalizer';
import {sanitizePublicStorefrontProduct,sanitizePublicStorefrontOption} from './product-public-copy';
import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { publicDataCache, catalogCacheTag } from "@/lib/public-data-cache";

import { migratedProducts, type MigratedProduct, type ProductPurchaseOptionSnapshot } from "@/data/migrated-products";
import { normalizeProductOptionRow } from "@/lib/catalog-architecture-repository";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getCategoryBySlug, getProductBySlug } from "@/lib/products";
import { productMatchesCategory } from "@/lib/category-products";
import { getProductPurchaseOptions, isPurchaseOptionSellableForProduct } from "@/lib/purchase-options";

const readPublicCatalog = publicDataCache(async () => getStorefrontProductsFromClient(getSupabaseAdmin() as ProductRepositoryClient), "public-catalog-list-v1", catalogCacheTag);
// Cache serializable null for missing products; callers retain the undefined contract.
const readPublicProduct = publicDataCache(async (slug: string) => (await getStorefrontProductBySlugFromClient(getSupabaseAdmin() as ProductRepositoryClient, slug)) ?? null, "public-catalog-product-v1", catalogCacheTag);

type ProductQueryResult = PromiseLike<{ data: unknown[] | null; error: null | { message: string } }>;
type ProductSingleQueryResult<T = unknown> = PromiseLike<{ data: T | null; error: null | { message: string } }>;
type ProductQueryBuilder = ProductQueryResult & {
  eq: (column: string, value: unknown) => ProductQueryBuilder;
  in: (column: string, value: unknown[]) => ProductQueryBuilder;
  limit: (limit: number) => ProductQueryBuilder;
  maybeSingle: <T = unknown>() => ProductSingleQueryResult<T>;
  order: (column: string, options: { ascending: boolean }) => ProductQueryBuilder;
};

export type ProductRepositoryClient = {
  from: (table: string) => {
    select: (columns?: string) => ProductQueryBuilder;
  };
};

type ProductRow = Record<string, unknown>;
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
  "sort_order",
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
  "supports_multilink",
  "supported_destinations",
  "activation_type",
  "included_service_label",
  "customization_options",
  "allows_logo_upload",
  "allows_custom_design",
  "design_mode",
  "display_text",
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
  "seo_description",
  "search_keywords",
  "size_options",
  "color_options",
  "key_features",
  "how_it_works",
  "specifications",
  "included_items",
  "product_faqs"
].join(",");
const STOREFRONT_PRODUCT_OPTION_COLUMNS = [
  "id",
  "product_slug",
  "option_code",
  "title",
  "description",
  "price_cents",
  "monthly_price_cents",
  "max_links",
  "requires_destination_url",
  "has_qr",
  "requires_logo",
  "requires_business_name",
  "requires_design_step",
  "requires_front_proof",
  "requires_subscription",
  "account_required",
  "supports_reorderable_links",
  "supports_link_visibility",
  "landing_page_url_pattern",
  "footer_label",
  "is_active",
  "sort_order"
].join(",");

export function staticStorefrontProducts(): MigratedProduct[] {
  return migratedProducts.filter(isPublicLaunchStorefrontProduct).map(sanitizePublicStorefrontProduct).sort(compareStorefrontProducts);
}

export async function getStorefrontProducts(): Promise<MigratedProduct[]> {
  noStore();

  if (!hasSupabaseAdminConfig()) {
    return staticStorefrontProducts();
  }

  try {
    const databaseProducts = await readPublicCatalog();
    return databaseProducts;
  } catch (error) {
    console.warn("[product-repository] storefront_unavailable", {
      reason: error instanceof Error ? error.message : "unknown database query failure"
    });
    return [];
  }
}

export async function getCheckoutProducts(): Promise<MigratedProduct[]> {
  if (!hasSupabaseAdminConfig()) throw new Error("Checkout catalog storage is not configured.");
  return getStorefrontProductsFromClient(getSupabaseAdmin() as ProductRepositoryClient);
}

export async function getCheckoutProductBySlug(slug: string): Promise<MigratedProduct | undefined> {
  if (!hasSupabaseAdminConfig()) throw new Error("Checkout catalog storage is not configured.");
  return getStorefrontProductBySlugFromClient(getSupabaseAdmin() as ProductRepositoryClient, slug);
}

export const getStorefrontProductBySlug = cache(async (slug: string): Promise<MigratedProduct | undefined> => {
  noStore();
  if (!hasSupabaseAdminConfig()) {
    return getStaticStorefrontProductBySlug(slug);
  }

  try {
    return (await readPublicProduct(slug)) ?? undefined;
  } catch (error) {
    console.warn("[product-repository] storefront_product_unavailable", {
      slug,
      reason: error instanceof Error ? error.message : "unknown database query failure"
    });
    return undefined;
  }
});

export async function getStorefrontProductsByCategory(slug: string): Promise<MigratedProduct[]> {
  const products = await getStorefrontProducts();
  const categorySlug = getCategoryBySlug(slug)?.slug ?? slug;

  return products.filter((product) => productMatchesCategory(product, categorySlug)).sort(compareStorefrontProducts);
}

export function getStorefrontRelatedProducts(product: MigratedProduct, products: MigratedProduct[], limit = 3): MigratedProduct[] {
  const sameCategory = products.filter(
    (item) => item.slug !== product.slug && item.categorySlug === product.categorySlug && item.isActive && item.stockStatus === "instock"
  );

  return sameCategory.sort(compareStorefrontProducts).slice(0, limit);
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

  if (!product?.isActive) {
    return undefined;
  }

  const options = await getActiveProductOptionsFromClient(client, [product.slug]);
  const productWithOptions = withAttachedOptions(product, options);

  return isPublicLaunchStorefrontProduct(productWithOptions) ? productWithOptions : undefined;
}

export async function getRelatedStorefrontProductsForProduct(product: MigratedProduct, limit = 3): Promise<MigratedProduct[]> {
  if (!hasSupabaseAdminConfig()) {
    const catalog = staticStorefrontProducts();
    const related = getStorefrontRelatedProducts(product, catalog, limit);
    const seen = new Set([product.slug, ...related.map((item) => item.slug)]);
    return [...related, ...catalog.filter((item) => !seen.has(item.slug) && item.isActive && item.stockStatus === "instock")].slice(0, limit);
  }

  try {
    const fetchLimit = Math.max(limit + 4, 8);
    const categoryProducts = await getStorefrontProductsByCategoryFromClient(getSupabaseAdmin() as ProductRepositoryClient, product.categorySlug, fetchLimit);

    const related = getStorefrontRelatedProducts(product, categoryProducts, limit);
    if (related.length >= limit) return related;
    const catalog = await getStorefrontProducts();
    const seen = new Set([product.slug, ...related.map((item) => item.slug)]);
    return [...related, ...catalog.filter((item) => !seen.has(item.slug) && item.isActive && item.stockStatus === "instock")].slice(0, limit);
  } catch {
    return [];
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
    .eq("stock_status", "instock");

  if (error) {
    throw new Error(error.message);
  }

  const products = (data ?? [])
    .map((row) => normalizeStorefrontProductRow(row))
    .filter((item): item is MigratedProduct => Boolean(item?.isActive && item.stockStatus === "instock" && item.categorySlug === categorySlug));
  const optionsByProduct = await getActiveProductOptionsFromClient(client, products.map((product) => product.slug));

  return products
    .map((product) => withAttachedOptions(product, optionsByProduct))
    .filter(isPublicLaunchStorefrontProduct)
    .sort(compareStorefrontProducts)
    .slice(0, limit);
}

export async function getStorefrontProductsFromClient(client: ProductRepositoryClient): Promise<MigratedProduct[]> {
  const { data, error } = await client.from("products").select(STOREFRONT_PRODUCT_COLUMNS).eq("is_active", true);

  if (error || !data) {
    throw new Error(error?.message ?? "Catalog query returned no data.");
  }

  const products = data
    .map((row) => normalizeStorefrontProductRow(row))
    .filter((product): product is MigratedProduct => Boolean(product?.isActive));
  const optionsByProduct = await getActiveProductOptionsFromClient(client, products.map((product) => product.slug));
  const productsWithOptions = products
    .map((product) => withAttachedOptions(product, optionsByProduct))
    .filter(isPublicLaunchStorefrontProduct)
    .sort(compareStorefrontProducts);

  return productsWithOptions;
}

async function getActiveProductOptionsFromClient(client: ProductRepositoryClient, productSlugs: string[]) {
  const optionsByProduct = new Map<string, ProductPurchaseOptionSnapshot[]>();
  const slugs = Array.from(new Set(productSlugs.filter(Boolean)));
  if (slugs.length === 0) {
    return optionsByProduct;
  }

  const { data, error } = await client
    .from("product_options")
    .select(STOREFRONT_PRODUCT_OPTION_COLUMNS)
    .in("product_slug", slugs)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  for (const option of (data ?? []).map(normalizeProductOptionRow)) {
    if (!option?.isActive || !option.productSlug) {
      continue;
    }

    const productOptions = optionsByProduct.get(option.productSlug) ?? [];
    productOptions.push(option);
    optionsByProduct.set(option.productSlug, productOptions);
  }

  for (const [productSlug, options] of optionsByProduct) {
    optionsByProduct.set(productSlug, options.sort((first, second) => first.sortOrder - second.sortOrder));
  }

  return optionsByProduct;
}

function getStaticStorefrontProductBySlug(slug: string) {
  const product = getProductBySlug(slug);

  return product && isPublicLaunchStorefrontProduct(product) ? sanitizePublicStorefrontProduct(product) : undefined;
}

function withAttachedOptions(product: MigratedProduct, optionsByProduct: Map<string, ProductPurchaseOptionSnapshot[]>): MigratedProduct {
  // An empty database option set must not restore code-defined sellable options.
  const options = optionsByProduct.get(product.slug) ?? [];

  const sanitizedProduct = sanitizePublicStorefrontProduct(product);
  const publicOptions = options
    .map(sanitizePublicStorefrontOption)
    .filter((option) => option.isActive && isPurchaseOptionSellableForProduct(sanitizedProduct, option.optionCode));

  return { ...sanitizedProduct, purchaseOptions: publicOptions };
}

export function isPublicLaunchStorefrontProduct(product: MigratedProduct): boolean {
  if (!product.isActive || product.status === "archived" || product.status === "draft" || product.stockStatus !== "instock") {
    return false;
  }

  if (isNonProductionStorefrontSlug(product.slug)) {
    return false;
  }

  if (product.slug === "multi-link-stand" || product.productKind === "hosted_multilink" || product.serviceMode === "hosted_landing_page" || product.requiresLandingPage) {
    return false;
  }

  if (product.checkoutMode !== "buy_now") {
    return false;
  }

  return getProductPurchaseOptions(product).some((option) => option.id === "branded_qr_direct");
}

function isNonProductionStorefrontSlug(slug: string): boolean {
  const normalized = slug.toLowerCase();
  return (
    normalized.startsWith("qa-") ||
    normalized.startsWith("test-") ||
    normalized.startsWith("demo-") ||
    normalized.includes("-qa-") ||
    normalized.includes("-test-") ||
    normalized.includes("-demo-")
  );
}

function compareStorefrontProducts(first: MigratedProduct, second: MigratedProduct) {
  const sortRank = (first.sortOrder ?? 1000) - (second.sortOrder ?? 1000);
  if (sortRank !== 0) {
    return sortRank;
  }

  return first.title.localeCompare(second.title, undefined, { sensitivity: "base" }) || first.slug.localeCompare(second.slug);
}
