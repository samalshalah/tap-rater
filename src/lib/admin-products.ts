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
    const { data, error } = await (getSupabaseAdmin() as AdminProductClient).from("products").select("*");

    if (error || !data) {
      return migratedProducts;
    }

    const products = data
      .map((row) => normalizeStorefrontProductRow(row))
      .filter((product): product is MigratedProduct => Boolean(product));

    return products.length > 0 ? products : migratedProducts;
  } catch {
    return migratedProducts;
  }
}

export async function getAdminProductBySlug(slug: string): Promise<MigratedProduct | undefined> {
  const products = await getAdminProducts();

  return products.find((product) => product.slug === slug);
}
