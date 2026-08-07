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
    basePriceCents: 0,
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
    customizationOptions: ["standard_design", "add_logo", "custom_design"],
    allowsLogoUpload: true,
    allowsCustomDesign: true,
    designMode: "standard",
    designLogic: "standard_platform_locked",
    pricingTier: "standard_direct",
    useCaseSlugs: [],
    featured: false,
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

  const dbProducts = data
    .map((row) => normalizeStorefrontProductRow(row))
    .filter((product): product is MigratedProduct => Boolean(product));

  // Merge, don't replace -- see the identical fix and rationale in
  // src/lib/product-repository.ts. Admin should see every product (static
  // + DB-edited + newly created), not just whatever rows exist in the DB.
  const merged = new Map(migratedProducts.map((product) => [product.slug, product]));
  for (const product of dbProducts) {
    merged.set(product.slug, product);
  }

  return Array.from(merged.values());
}

export async function getAdminProductBySlug(slug: string): Promise<MigratedProduct | undefined> {
  const products = await getAdminProducts();

  return products.find((product) => product.slug === slug);
}
