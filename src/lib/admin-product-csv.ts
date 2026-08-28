import type { MigratedProduct, ProductPurchaseOptionSnapshot } from "@/data/migrated-products";
import { getCatalogCategories } from "@/lib/products";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { encodeCsv, parseCsv } from "@/lib/csv";
import { saveProductContent, type CmsDbClient } from "@/lib/cms-repository";
import type { BusinessUse, PlatformDestination, StandType } from "@/lib/catalog-architecture";
import { getBusinessUses, getPlatforms, getStandTypes } from "@/lib/catalog-architecture-repository";
import { normalizeStorefrontProductRow } from "@/lib/product-repository";
import { productContentSchema, type ProductContentInput } from "@/lib/validators";

export const PRODUCT_CSV_HEADERS = [
  "slug",
  "title",
  "sku",
  "category_slug",
  "stand_type_slug",
  "primary_platform_slug",
  "destination_type",
  "business_use_slugs",
  "is_special_solution",
  "product_kind",
  "status",
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
  "format",
  "customization_options",
  "allows_logo_upload",
  "allows_custom_design",
  "design_mode",
  "display_text",
  "default_cta_text",
  "cta_editable",
  "asset_readiness_status",
  "standard_angled_image_url",
  "branded_angled_image_url",
  "multilink_angled_image_url",
  "standard_front_template_url",
  "branded_front_template_url",
  "multilink_front_template_url",
  "center_asset_url",
  "landing_page_preview_config_json",
  "product_options_json",
  "images_json",
  "seo_title",
  "seo_description",
  "is_active",
  "updated_at",
  "search_keywords",
  "size_options_json",
  "color_options_json",
  "key_features_json",
  "how_it_works_json",
  "specifications_json",
  "included_items_json",
  "product_faqs_json"
] as const;

type QueryResult = PromiseLike<{ data: unknown[] | null; error: null | { message: string } }>;
type ProductCsvQueryBuilder = QueryResult & {
  in: (column: string, values: string[]) => ProductCsvQueryBuilder;
  order: (column: string, options: { ascending: boolean }) => ProductCsvQueryBuilder;
};

type ProductCsvTable = {
  upsert: CmsDbClient["from"] extends (table: string) => infer T ? T extends { upsert: infer U } ? U : never : never;
  insert: CmsDbClient["from"] extends (table: string) => infer T ? T extends { insert: infer U } ? U : never : never;
  delete: CmsDbClient["from"] extends (table: string) => infer T ? T extends { delete: infer U } ? U : never : never;
  select: (columns?: string) => ProductCsvQueryBuilder;
};

export type ProductCsvClient = Omit<CmsDbClient, "from"> & {
  from: (table: string) => ProductCsvTable;
};

export type ProductCsvValidationError = {
  row: number;
  message: string;
};

export type ProductCsvImportPlan = {
  ok: boolean;
  totalRows: number;
  validRows: number;
  createCount: number;
  updateCount: number;
  errors: ProductCsvValidationError[];
  products: ProductContentInput[];
};

export type ProductCsvApplyResult = Omit<ProductCsvImportPlan, "products"> & {
  created: number;
  updated: number;
  skipped: number;
};

export async function exportAdminProductsCsv() {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Database persistence is not configured. Product export requires backend product data.");
  }

  const products = await getAdminProductsForCsvFromClient(getSupabaseAdmin() as ProductCsvClient);
  return buildProductsCsv(products);
}

export function buildProductsCsv(products: MigratedProduct[]) {
  return encodeCsv(products.map(productToCsvRow), [...PRODUCT_CSV_HEADERS]);
}

export function buildProductCsvTemplate() {
  return encodeCsv([], [...PRODUCT_CSV_HEADERS]);
}

export async function validateProductCsvImport(csvText: string): Promise<ProductCsvImportPlan> {
  return validateProductCsvImportWithClient(csvText, getSupabaseAdmin() as ProductCsvClient);
}

export async function validateProductCsvImportWithClient(csvText: string, client: ProductCsvClient): Promise<ProductCsvImportPlan> {
  const existingProducts = await getAdminProductsForCsvFromClient(client);
  const [standTypes, businessUses, platforms] = await Promise.all([getStandTypes(), getBusinessUses(), getPlatforms()]);
  return buildImportPlan(csvText, existingProducts, { standTypes, businessUses, platforms });
}

export async function applyProductCsvImport(csvText: string): Promise<ProductCsvApplyResult> {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Database persistence is not configured. Product import requires backend product data.");
  }

  const client = getSupabaseAdmin() as ProductCsvClient;
  const plan = await validateProductCsvImportWithClient(csvText, client);
  if (!plan.ok) {
    return { ...withoutProducts(plan), created: 0, updated: 0, skipped: 0 };
  }

  const existingSlugs = new Set((await getAdminProductsForCsvFromClient(client)).map((product) => product.slug));
  let created = 0;
  let updated = 0;

  for (const product of plan.products) {
    await saveProductContent(client as unknown as CmsDbClient, product);
    if (existingSlugs.has(product.slug)) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return { ...withoutProducts(plan), created, updated, skipped: 0 };
}

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

export function buildImportPlan(
  csvText: string,
  existingProducts: MigratedProduct[],
  taxonomy: { standTypes: StandType[]; businessUses: BusinessUse[]; platforms: PlatformDestination[] }
): ProductCsvImportPlan {
  let parsed: ReturnType<typeof parseCsv>;
  try {
    parsed = parseCsv(csvText);
  } catch (error) {
    return emptyPlan([{ row: 1, message: error instanceof Error ? error.message : "CSV could not be parsed." }]);
  }

  const missingColumns = PRODUCT_CSV_HEADERS.filter((header) => !parsed.headers.includes(header));
  if (missingColumns.length > 0) {
    return emptyPlan([{ row: 1, message: `Missing required columns: ${missingColumns.join(", ")}` }], parsed.rows.length);
  }

  const existingBySlug = new Map(existingProducts.map((product) => [product.slug, product]));
  const skuOwnerBySku = new Map(existingProducts.map((product) => [product.sku.toLowerCase(), product.slug]));
  const seenSlugs = new Set<string>();
  const products: ProductContentInput[] = [];
  const errors: ProductCsvValidationError[] = [];
  const categorySlugs = new Set(getCatalogCategories().map((category) => category.slug));
  const standTypeSlugs = new Set(taxonomy.standTypes.map((item) => item.slug));
  const businessUseSlugs = new Set(taxonomy.businessUses.map((item) => item.slug));
  const platformSlugs = new Set(taxonomy.platforms.map((item) => item.slug));
  for (const product of existingProducts) {
    categorySlugs.add(product.categorySlug);
    if (product.standTypeSlug) standTypeSlugs.add(product.standTypeSlug);
    if (product.primaryPlatformSlug) platformSlugs.add(product.primaryPlatformSlug);
    for (const businessUseSlug of product.businessUseSlugs ?? []) {
      businessUseSlugs.add(businessUseSlug);
    }
  }

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const slug = row.slug.trim();
    if (!slug) {
      errors.push({ row: rowNumber, message: "slug is required." });
      return;
    }
    if (seenSlugs.has(slug)) {
      errors.push({ row: rowNumber, message: `duplicate slug "${slug}".` });
      return;
    }
    seenSlugs.add(slug);

    const product = csvRowToProduct(row, rowNumber, errors);
    if (!product) return;

    const skuOwner = skuOwnerBySku.get(product.sku.toLowerCase());
    if (skuOwner && skuOwner !== product.slug) {
      errors.push({ row: rowNumber, message: `SKU "${product.sku}" already belongs to "${skuOwner}".` });
    }
    if (!categorySlugs.has(product.categorySlug as ReturnType<typeof getCatalogCategories>[number]["slug"])) {
      errors.push({ row: rowNumber, message: `unknown category "${product.categorySlug}".` });
    }
    if (product.standTypeSlug && !standTypeSlugs.has(product.standTypeSlug)) {
      errors.push({ row: rowNumber, message: `unknown stand type "${product.standTypeSlug}".` });
    }
    if (product.primaryPlatformSlug && !platformSlugs.has(product.primaryPlatformSlug)) {
      errors.push({ row: rowNumber, message: `unknown platform "${product.primaryPlatformSlug}".` });
    }
    for (const businessUseSlug of product.businessUseSlugs) {
      if (!businessUseSlugs.has(businessUseSlug)) {
        errors.push({ row: rowNumber, message: `unknown business use "${businessUseSlug}".` });
      }
    }

    products.push(product);
  });

  const validRows = Math.max(0, parsed.rows.length - new Set(errors.map((error) => error.row)).size);
  return {
    ok: errors.length === 0,
    totalRows: parsed.rows.length,
    validRows: errors.length === 0 ? parsed.rows.length : validRows,
    createCount: products.filter((product) => !existingBySlug.has(product.slug)).length,
    updateCount: products.filter((product) => existingBySlug.has(product.slug)).length,
    errors,
    products: errors.length === 0 ? products : []
  };
}

function productToCsvRow(product: MigratedProduct): Record<string, string> {
  return {
    slug: product.slug,
    title: product.title,
    sku: product.sku,
    category_slug: product.categorySlug,
    stand_type_slug: product.standTypeSlug ?? "",
    primary_platform_slug: product.primaryPlatformSlug ?? "",
    destination_type: product.destinationType ?? "",
    business_use_slugs: serializeList(product.businessUseSlugs ?? []),
    is_special_solution: serializeBoolean(product.isSpecialSolution ?? false),
    product_kind: product.productKind ?? "normal_direct",
    status: product.status ?? (product.isActive ? "active" : "draft"),
    base_price_cents: String(product.basePriceCents),
    sale_price_cents: product.salePriceCents === undefined ? "" : String(product.salePriceCents),
    stock_status: product.stockStatus,
    short_description: product.shortDescription,
    description: product.description,
    product_type: product.productType,
    service_mode: product.serviceMode,
    checkout_mode: product.checkoutMode,
    requires_account: serializeBoolean(product.requiresAccount),
    requires_subscription: serializeBoolean(product.requiresSubscription),
    requires_landing_page: serializeBoolean(product.requiresLandingPage),
    supported_destinations: serializeList(product.supportedDestinations),
    activation_type: product.activationType,
    included_service_label: product.includedServiceLabel,
    format: product.format,
    customization_options: serializeList(product.customizationOptions),
    allows_logo_upload: serializeBoolean(product.allowsLogoUpload),
    allows_custom_design: serializeBoolean(product.allowsCustomDesign),
    design_mode: product.designMode,
    display_text: product.displayText ?? "",
    default_cta_text: product.defaultCtaText ?? "",
    cta_editable: serializeBoolean(product.ctaEditable ?? false),
    asset_readiness_status: product.assetReadinessStatus ?? "draft_missing_assets",
    standard_angled_image_url: product.assetSet?.standardAngledImageUrl ?? "",
    branded_angled_image_url: product.assetSet?.brandedAngledImageUrl ?? "",
    multilink_angled_image_url: product.assetSet?.multiLinkAngledImageUrl ?? "",
    standard_front_template_url: product.assetSet?.standardFrontTemplateUrl ?? "",
    branded_front_template_url: product.assetSet?.brandedFrontTemplateUrl ?? "",
    multilink_front_template_url: product.assetSet?.multiLinkFrontTemplateUrl ?? "",
    center_asset_url: product.assetSet?.centerAssetUrl ?? "",
    landing_page_preview_config_json: JSON.stringify(product.assetSet?.landingPagePreviewConfig ?? {}),
    product_options_json: JSON.stringify(product.purchaseOptions ?? []),
    images_json: JSON.stringify(product.images ?? []),
    seo_title: product.seoTitle ?? "",
    seo_description: product.seoDescription ?? "",
    is_active: serializeBoolean(product.isActive),
    updated_at: product.updatedAt ?? "",
    search_keywords: serializeList(product.searchKeywords ?? []),
    size_options_json: JSON.stringify(product.sizeOptions ?? []),
    color_options_json: JSON.stringify(product.colorOptions ?? []),
    key_features_json: JSON.stringify(product.keyFeatures ?? []),
    how_it_works_json: JSON.stringify(product.howItWorks ?? []),
    specifications_json: JSON.stringify(product.specifications ?? []),
    included_items_json: JSON.stringify(product.includedItems ?? []),
    product_faqs_json: JSON.stringify(product.productFaqs ?? [])
  };
}

function csvRowToProduct(row: Record<string, string>, rowNumber: number, errors: ProductCsvValidationError[]) {
  const productOptions = readJson<ProductPurchaseOptionSnapshot[]>(row.product_options_json, rowNumber, "product_options_json", errors, []);
  const images = readJson<{ src: string; alt: string }[]>(row.images_json, rowNumber, "images_json", errors, []);
  const landingPagePreviewConfig = readJson<Record<string, unknown>>(row.landing_page_preview_config_json, rowNumber, "landing_page_preview_config_json", errors, {});
  const sizeOptions = readJson<unknown[]>(row.size_options_json, rowNumber, "size_options_json", errors, []);
  const colorOptions = readJson<unknown[]>(row.color_options_json, rowNumber, "color_options_json", errors, []);
  const keyFeatures = readJson<unknown[]>(row.key_features_json, rowNumber, "key_features_json", errors, []);
  const howItWorks = readJson<unknown[]>(row.how_it_works_json, rowNumber, "how_it_works_json", errors, []);
  const specifications = readJson<unknown[]>(row.specifications_json, rowNumber, "specifications_json", errors, []);
  const includedItems = readJson<unknown[]>(row.included_items_json, rowNumber, "included_items_json", errors, []);
  const productFaqs = readJson<unknown[]>(row.product_faqs_json, rowNumber, "product_faqs_json", errors, []);
  const booleans = {
    isSpecialSolution: readBoolean(row.is_special_solution, rowNumber, "is_special_solution", errors),
    requiresAccount: readBoolean(row.requires_account, rowNumber, "requires_account", errors),
    requiresSubscription: readBoolean(row.requires_subscription, rowNumber, "requires_subscription", errors),
    requiresLandingPage: readBoolean(row.requires_landing_page, rowNumber, "requires_landing_page", errors),
    allowsLogoUpload: readBoolean(row.allows_logo_upload, rowNumber, "allows_logo_upload", errors),
    allowsCustomDesign: readBoolean(row.allows_custom_design, rowNumber, "allows_custom_design", errors),
    ctaEditable: readBoolean(row.cta_editable, rowNumber, "cta_editable", errors),
    isActive: readBoolean(row.is_active, rowNumber, "is_active", errors)
  };
  const basePriceCents = readInteger(row.base_price_cents, rowNumber, "base_price_cents", errors);
  const salePriceCents = row.sale_price_cents.trim() ? readInteger(row.sale_price_cents, rowNumber, "sale_price_cents", errors) : undefined;

  const candidate = productContentSchema.safeParse({
    slug: row.slug,
    title: row.title,
    sku: row.sku,
    categorySlug: row.category_slug,
    standTypeSlug: optionalString(row.stand_type_slug),
    primaryPlatformSlug: optionalString(row.primary_platform_slug),
    destinationType: optionalString(row.destination_type),
    businessUseSlugs: parseList(row.business_use_slugs),
    isSpecialSolution: booleans.isSpecialSolution,
    productKind: row.product_kind || "normal_direct",
    status: row.status || "draft",
    basePriceCents,
    salePriceCents,
    stockStatus: row.stock_status,
    shortDescription: row.short_description,
    description: row.description,
    productType: row.product_type,
    serviceMode: row.service_mode,
    checkoutMode: row.checkout_mode,
    requiresAccount: booleans.requiresAccount,
    requiresSubscription: booleans.requiresSubscription,
    requiresLandingPage: booleans.requiresLandingPage,
    supportedDestinations: parseList(row.supported_destinations),
    activationType: row.activation_type,
    includedServiceLabel: row.included_service_label,
    format: row.format,
    customizationOptions: parseList(row.customization_options),
    allowsLogoUpload: booleans.allowsLogoUpload,
    allowsCustomDesign: booleans.allowsCustomDesign,
    designMode: row.design_mode,
    displayText: optionalString(row.display_text),
    defaultCtaText: optionalString(row.default_cta_text),
    ctaEditable: booleans.ctaEditable,
    assetReadinessStatus: row.asset_readiness_status,
    assetSet: {
      standardAngledImageUrl: optionalString(row.standard_angled_image_url),
      brandedAngledImageUrl: optionalString(row.branded_angled_image_url),
      multiLinkAngledImageUrl: optionalString(row.multilink_angled_image_url),
      standardFrontTemplateUrl: optionalString(row.standard_front_template_url),
      brandedFrontTemplateUrl: optionalString(row.branded_front_template_url),
      multiLinkFrontTemplateUrl: optionalString(row.multilink_front_template_url),
      centerAssetUrl: optionalString(row.center_asset_url),
      landingPagePreviewConfig
    },
    productOptions,
    images,
    seoTitle: optionalString(row.seo_title),
    seoDescription: optionalString(row.seo_description),
    searchKeywords: parseList(row.search_keywords),
    sizeOptions,
    colorOptions,
    keyFeatures,
    howItWorks,
    specifications,
    includedItems,
    productFaqs,
    isActive: booleans.isActive
  });

  if (!candidate.success) {
    for (const issue of candidate.error.issues) {
      errors.push({ row: rowNumber, message: `${issue.path.join(".") || "product"}: ${issue.message}` });
    }
    return null;
  }

  return candidate.data;
}

async function getBusinessUseSlugsByProductSlug(client: ProductCsvClient, slugs: string[]) {
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
    output.set(productSlug, [...(output.get(productSlug) ?? []), businessUseSlug]);
  }
  return output;
}

async function getProductOptionsByProductSlug(client: ProductCsvClient, slugs: string[]) {
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
    output.set(productSlug, [...(output.get(productSlug) ?? []), normalized]);
  }
  return output;
}

function normalizeProductOptionSnapshot(row: Record<string, unknown>): ProductPurchaseOptionSnapshot | null {
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

function readJson<T>(value: string, row: number, column: string, errors: ProductCsvValidationError[], fallback: T): T {
  const text = value.trim();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as T;
    if (hasUnsafeObjectKey(parsed)) {
      errors.push({ row, message: `${column} contains unsafe object keys.` });
      return fallback;
    }
    return parsed;
  } catch {
    errors.push({ row, message: `malformed ${column}.` });
    return fallback;
  }
}

function hasUnsafeObjectKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasUnsafeObjectKey);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") return true;
    if (hasUnsafeObjectKey(child)) return true;
  }
  return false;
}

function parseList(value: string) {
  return Array.from(new Set(value.split("|").map((item) => item.trim()).filter(Boolean)));
}

function serializeList(values: string[] | undefined) {
  return Array.from(new Set(values ?? [])).join("|");
}

function readBoolean(value: string, row: number, column: string, errors: ProductCsvValidationError[]) {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  errors.push({ row, message: `invalid boolean in ${column}.` });
  return false;
}

function serializeBoolean(value: boolean) {
  return value ? "true" : "false";
}

function readInteger(value: string, row: number, column: string, errors: ProductCsvValidationError[]) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  errors.push({ row, message: `invalid integer in ${column}.` });
  return 0;
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function emptyPlan(errors: ProductCsvValidationError[], totalRows = 0): ProductCsvImportPlan {
  return { ok: false, totalRows, validRows: 0, createCount: 0, updateCount: 0, errors, products: [] };
}

function withoutProducts(plan: ProductCsvImportPlan): Omit<ProductCsvImportPlan, "products"> {
  return {
    ok: plan.ok,
    totalRows: plan.totalRows,
    validRows: plan.validRows,
    createCount: plan.createCount,
    updateCount: plan.updateCount,
    errors: plan.errors
  };
}
