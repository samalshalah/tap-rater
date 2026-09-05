import { unstable_noStore as noStore } from "next/cache";
import type { MigratedProduct, ProductPurchaseOptionSnapshot } from "@/data/migrated-products";
import { migratedProducts } from "@/data/migrated-products";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { normalizeStorefrontProductRow } from "@/lib/product-repository";
import { normalizeProductOptionRow } from "@/lib/catalog-architecture-repository";

type AdminProductQueryResult = PromiseLike<{ data: unknown[] | null; error: null | { message: string } }>;

type AdminProductClient = {
  from: (table: string) => {
    select: (columns?: string) => AdminProductQueryResult;
  };
};

export function createBlankAdminProduct(): MigratedProduct {
  return {
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
    sortOrder: 1000,
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
    supportedDestinations: ["google"],
    activationType: "free_basic_activation",
    includedServiceLabel: "Free basic activation",
    format: "stand",
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
    isActive: false,
    seoTitle: "",
    seoDescription: "",
    searchKeywords: []
  };
}

export async function getAdminProducts(): Promise<MigratedProduct[]> {
  noStore();
  if (!hasSupabaseAdminConfig()) {
    return migratedProducts;
  }

  return getAdminProductsFromClient(getSupabaseAdmin() as AdminProductClient);
}

export async function getAdminProductsFromClient(client: AdminProductClient): Promise<MigratedProduct[]> {
  const { data, error } = await client.from("products").select("*");

  if (error || !data) {
    throw new Error(error?.message ?? "Admin catalog query returned no data.");
  }

  const businessUseSlugsByProductSlug = await getProductBusinessUseSlugsByProductSlug(client);
  const optionResult = await client.from("product_options").select("*");
  if (optionResult.error || !optionResult.data) throw new Error(optionResult.error?.message ?? "Admin options query returned no data.");
  const optionsByProduct = new Map<string, ProductPurchaseOptionSnapshot[]>();
  for (const row of optionResult.data) {
    const option = normalizeProductOptionRow(row);
    if (!option?.productSlug) continue;
    const options = optionsByProduct.get(option.productSlug) ?? [];
    options.push(option);
    optionsByProduct.set(option.productSlug, options);
  }

  return data
    .map((row) => normalizeStorefrontProductRow(row, { sanitizePublicCopy: false }))
    .filter((product): product is MigratedProduct => Boolean(product))
    .map((product) => ({
      ...product,
      purchaseOptions: (optionsByProduct.get(product.slug) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
      businessUseSlugs: businessUseSlugsByProductSlug.get(product.slug) ?? product.businessUseSlugs ?? []
    }))
    .sort(compareAdminProducts);
}

export async function getAdminProductBySlug(slug: string): Promise<MigratedProduct | undefined> {
  const products = await getAdminProducts();

  return products.find((product) => product.slug === slug);
}

async function getProductBusinessUseSlugsByProductSlug(client: AdminProductClient) {
  const slugsByProductSlug = new Map<string, string[]>();

  try {
    const { data, error } = await client.from("product_business_uses").select("product_slug,business_use_slug,sort_order");
    if (error || !data) {
      return slugsByProductSlug;
    }

    for (const row of data) {
      if (!row || typeof row !== "object") {
        continue;
      }

      const record = row as Record<string, unknown>;
      const productSlug = typeof record.product_slug === "string" ? record.product_slug : undefined;
      const businessUseSlug = typeof record.business_use_slug === "string" ? record.business_use_slug : undefined;

      if (!productSlug || !businessUseSlug) {
        continue;
      }

      const current = slugsByProductSlug.get(productSlug) ?? [];
      current.push(businessUseSlug);
      slugsByProductSlug.set(productSlug, current);
    }
  } catch {
    return slugsByProductSlug;
  }

  return slugsByProductSlug;
}

function compareAdminProducts(first: MigratedProduct, second: MigratedProduct) {
  const statusRank = productStatusRank(first) - productStatusRank(second);
  if (statusRank !== 0) {
    return statusRank;
  }

  const sortRank = (first.sortOrder ?? 1000) - (second.sortOrder ?? 1000);
  if (sortRank !== 0) {
    return sortRank;
  }

  return first.title.localeCompare(second.title, undefined, { sensitivity: "base" }) || first.slug.localeCompare(second.slug);
}

function productStatusRank(product: MigratedProduct) {
  if (product.isActive && product.status !== "archived") {
    return 0;
  }
  if (product.status === "draft") {
    return 1;
  }
  return 2;
}
