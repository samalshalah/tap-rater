import type { MigratedProduct, ProductPurchaseOptionSnapshot } from "@/data/migrated-products";
import type { ProductCsvClient } from "./admin-product-csv";
import { normalizeStorefrontProductRow } from "@/lib/product-repository";

export async function getAdminProductsForCsvFromClient(client: ProductCsvClient): Promise<MigratedProduct[]> {
  const { data, error } = await client.from("products").select("*");
  if (error) {
    throw new Error(error.message);
  }

  const products = (data ?? [])
    .map((row) => normalizeStorefrontProductRow(row, { sanitizePublicCopy: false }))
    .filter((product): product is MigratedProduct => Boolean(product));
  const slugs = products.map((product) => product.slug);
  const [businessUseSlugsByProductSlug, optionsByProductSlug] = await Promise.all([
    getBusinessUseSlugsByProductSlug(client, slugs),
    getProductOptionsByProductSlug(client, slugs)
  ]);

  return products
    .map((product) => ({
      ...product,
      businessUseSlugs: businessUseSlugsByProductSlug.get(product.slug) ?? [],
      purchaseOptions: optionsByProductSlug.get(product.slug) ?? product.purchaseOptions ?? []
    }))
    .sort((first, second) => first.slug.localeCompare(second.slug));
}

export async function getBusinessUseSlugsByProductSlug(client: ProductCsvClient, slugs: string[]) {
  const output = new Map<string, string[]>();
  if (slugs.length === 0) return output;
  const { data, error } = await client
    .from("product_business_uses")
    .select("product_slug,business_use_slug,sort_order")
    .in("product_slug", slugs)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const productSlug = typeof record.product_slug === "string" ? record.product_slug : "";
    const businessUseSlug = typeof record.business_use_slug === "string" ? record.business_use_slug : "";
    if (!productSlug || !businessUseSlug) continue;
    const group = output.get(productSlug);
    if (group) group.push(businessUseSlug);
    else output.set(productSlug, [businessUseSlug]);
  }
  return output;
}

export async function getProductOptionsByProductSlug(client: ProductCsvClient, slugs: string[]) {
  const output = new Map<string, ProductPurchaseOptionSnapshot[]>();
  if (slugs.length === 0) return output;
  const { data, error } = await client
    .from("product_options")
    .select("*")
    .in("product_slug", slugs)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  for (const option of data ?? []) {
    const record = option && typeof option === "object" ? (option as Record<string, unknown>) : {};
    const productSlug = typeof record.product_slug === "string" ? record.product_slug : "";
    if (!productSlug) continue;
    const normalized = normalizeProductOptionSnapshot(record);
    if (!normalized) continue;
    const group = output.get(productSlug);
    if (group) group.push(normalized);
    else output.set(productSlug, [normalized]);
  }
  return output;
}

export function normalizeProductOptionSnapshot(row: Record<string, unknown>): ProductPurchaseOptionSnapshot | null {
  const optionCode = row.option_code;
  const title = row.title;
  const priceCents = row.price_cents;
  if (
    (optionCode !== "standard_direct" && optionCode !== "branded_qr_direct" && optionCode !== "hosted_multilink") ||
    typeof title !== "string" ||
    typeof priceCents !== "number"
  ) {
    return null;
  }

  return {
    productSlug: typeof row.product_slug === "string" ? row.product_slug : undefined,
    optionCode,
    title,
    description: typeof row.description === "string" ? row.description : "",
    priceCents,
    monthlyPriceCents: typeof row.monthly_price_cents === "number" ? row.monthly_price_cents : undefined,
    maxLinks: typeof row.max_links === "number" ? row.max_links : undefined,
    requiresDestinationUrl: row.requires_destination_url === true,
    hasQr: row.has_qr === true,
    requiresLogo: row.requires_logo === true,
    requiresBusinessName: row.requires_business_name === true,
    requiresDesignStep: row.requires_design_step === true,
    requiresFrontProof: row.requires_front_proof === true,
    requiresSubscription: row.requires_subscription === true,
    accountRequired: row.account_required === true,
    supportsReorderableLinks: row.supports_reorderable_links === true,
    supportsLinkVisibility: row.supports_link_visibility === true,
    landingPageUrlPattern: typeof row.landing_page_url_pattern === "string" ? row.landing_page_url_pattern : undefined,
    footerLabel: typeof row.footer_label === "string" ? row.footer_label : undefined,
    isActive: row.is_active !== false,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0
  };
}
