import type { MigratedProduct } from "@/data/migrated-products";
import { migratedProducts } from "@/data/migrated-products";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { normalizeStorefrontProductRow } from "@/lib/product-repository";

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
  if (!hasSupabaseAdminConfig()) {
    return migratedProducts;
  }

  try {
    return await getAdminProductsFromClient(getSupabaseAdmin() as AdminProductClient);
  } catch {
    return migratedProducts;
  }
}

export async function getAdminProductsFromClient(client: AdminProductClient): Promise<MigratedProduct[]> {
  const { data, error } = await client.from("products").select("*");

  if (error || !data) {
    return migratedProducts;
  }

  const businessUseSlugsByProductSlug = await getProductBusinessUseSlugsByProductSlug(client);

  return data
    .map((row) => normalizeStorefrontProductRow(row, { sanitizePublicCopy: false }))
    .filter((product): product is MigratedProduct => Boolean(product))
    .map((product) => ({
      ...product,
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
