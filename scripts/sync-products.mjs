import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

export const FIELD_OWNERSHIP_POLICY = {
  adminOwned: [
    "title",
    "sku",
    "status",
    "stock_status",
    "base_price_cents",
    "sale_price_cents",
    "short_description",
    "description",
    "seo_title",
    "seo_description",
    "images",
    "asset_readiness_status"
  ],
  systemOwned: [
    "category_slug",
    "stand_type_slug",
    "primary_platform_slug",
    "destination_type",
    "is_special_solution",
    "product_kind",
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
    "format",
    "customization_options",
    "allows_logo_upload",
    "allows_custom_design",
    "design_mode",
    "default_cta_text",
    "cta_editable"
  ],
  fillIfEmptyAssets: [
    "standard_angled_image_url",
    "branded_angled_image_url",
    "standard_front_template_url",
    "branded_front_template_url",
    "multilink_front_template_url",
    "center_asset_url"
  ]
};

loadEnvFile(resolve(rootDir, ".env.local"));

const { migratedProducts } = loadTsExports("src/data/migrated-products.ts");
const { getDefaultOptionsForProductKind, lockedBusinessUses, lockedPlatforms, lockedStandTypes } = loadTsExports(
  "src/lib/catalog-architecture.ts"
);

const approvedProducts = migratedProducts.filter((product) => product.isActive);
const approvedProductsBySlug = new Map(approvedProducts.map((product) => [product.slug, product]));

export function parseSyncProductArgs(argv) {
  const apply = argv.includes("--apply");
  const json = argv.includes("--json");
  const help = argv.includes("--help") || argv.includes("-h");
  const allowWrites = apply && argv.includes("--confirm-fill-empty-assets");
  const allowProductSync = apply && argv.includes("--confirm-product-sync");

  return {
    mode: allowProductSync ? "product-sync" : allowWrites ? "safe-fill-empty-assets" : "dry-run",
    apply,
    allowWrites,
    allowProductSync,
    help,
    json
  };
}

export function createCatalogReconciliationPlan({ databaseProducts, productOptions = [], productBusinessUses = [] }) {
  const activeDatabaseProducts = databaseProducts.filter((product) => readBoolean(product.is_active) !== false);
  const databaseProductsBySlug = new Map(activeDatabaseProducts.map((product) => [readString(product.slug), product]).filter(([slug]) => slug));
  const approvedSlugs = new Set(approvedProducts.map((product) => product.slug));
  const databaseSlugs = new Set(databaseProductsBySlug.keys());
  const productOptionsBySlug = groupRowsBy(productOptions, "product_slug");
  const businessUsesBySlug = groupRowsBy(productBusinessUses, "product_slug");

  const missingProducts = approvedProducts
    .filter((product) => !databaseSlugs.has(product.slug))
    .map((product) => ({ slug: product.slug, title: product.title, action: "manual-approval-required" }));
  const dbOnlyProducts = activeDatabaseProducts
    .filter((product) => {
      const slug = readString(product.slug);
      return slug && !approvedSlugs.has(slug);
    })
    .map((product) => ({
      slug: readString(product.slug),
      title: readString(product.title),
      status: readString(product.status) ?? "unknown",
      isActive: readBoolean(product.is_active) !== false,
      action: "report-only"
    }));

  const fieldMismatches = [];
  const optionMismatches = [];
  const businessUseMismatches = [];
  const fillIfEmptyAssetUpdates = [];
  const manualAssetRequirements = [];

  for (const approvedProduct of approvedProducts) {
    const databaseProduct = databaseProductsBySlug.get(approvedProduct.slug);
    if (!databaseProduct) {
      continue;
    }

    for (const field of FIELD_OWNERSHIP_POLICY.systemOwned) {
      const expected = canonicalProductValue(approvedProduct, field);
      const actual = normalizeComparable(databaseProduct[field]);
      if (!areComparableValuesEqual(actual, expected)) {
        fieldMismatches.push({
          slug: approvedProduct.slug,
          field,
          owner: "system",
          expected,
          actual,
          action: "report-only"
        });
      }
    }

    for (const field of FIELD_OWNERSHIP_POLICY.adminOwned) {
      const expected = canonicalProductValue(approvedProduct, field);
      const actual = normalizeComparable(databaseProduct[field]);
      if (!areComparableValuesEqual(actual, expected)) {
        fieldMismatches.push({
          slug: approvedProduct.slug,
          field,
          owner: "admin",
          expected,
          actual,
          action: "preserve-db-value"
        });
      }
    }

    const assetPlan = getFillIfEmptyAssetUpdates(databaseProduct, approvedProduct);
    fillIfEmptyAssetUpdates.push(...assetPlan.updates);
    manualAssetRequirements.push(...assetPlan.manual);

    const expectedOptions = getOptionsForProduct(approvedProduct).map((option) => option.optionCode).sort();
    const actualOptions = (productOptionsBySlug.get(approvedProduct.slug) ?? [])
      .filter((row) => readBoolean(row.is_active) !== false)
      .map((row) => readString(row.option_code))
      .filter(Boolean)
      .sort();
    if (!areComparableValuesEqual(actualOptions, expectedOptions)) {
      optionMismatches.push({
        slug: approvedProduct.slug,
        expected: expectedOptions,
        actual: actualOptions,
        action: "report-only"
      });
    }

    const expectedBusinessUses = Array.from(new Set(approvedProduct.businessUseSlugs ?? [])).sort();
    const actualBusinessUses = (businessUsesBySlug.get(approvedProduct.slug) ?? [])
      .map((row) => readString(row.business_use_slug))
      .filter(Boolean)
      .sort();
    if (!areComparableValuesEqual(actualBusinessUses, expectedBusinessUses)) {
      businessUseMismatches.push({
        slug: approvedProduct.slug,
        expected: expectedBusinessUses,
        actual: actualBusinessUses,
        action: "report-only"
      });
    }
  }

  return {
    mode: "dry-run",
    approvedProductCount: approvedProducts.length,
    databaseActiveProductCount: activeDatabaseProducts.length,
    lockedStandTypeCount: lockedStandTypes.filter((item) => item.isActive).length,
    lockedBusinessUseCount: lockedBusinessUses.filter((item) => item.isActive).length,
    lockedPlatformCount: lockedPlatforms.filter((item) => item.isActive).length,
    missingProducts,
    dbOnlyProducts,
    fieldMismatches,
    optionMismatches,
    businessUseMismatches,
    fillIfEmptyAssetUpdates,
    manualAssetRequirements,
    productionWrites: 0
  };
}

export function getFillIfEmptyAssetUpdates(databaseProduct, approvedProduct) {
  const updates = [];
  const manual = [];
  const candidates = {
    standard_angled_image_url: [
      readString(databaseProduct.standard_angled_image_url),
      readImageAt(databaseProduct.images, 0),
      approvedProduct.assetSet?.standardAngledImageUrl,
      approvedProduct.images?.[0]?.src
    ],
    branded_angled_image_url: [readString(databaseProduct.branded_angled_image_url), approvedProduct.assetSet?.brandedAngledImageUrl],
    standard_front_template_url: [readString(databaseProduct.standard_front_template_url), approvedProduct.assetSet?.standardFrontTemplateUrl],
    branded_front_template_url: [readString(databaseProduct.branded_front_template_url), approvedProduct.assetSet?.brandedFrontTemplateUrl],
    multilink_front_template_url: [readString(databaseProduct.multilink_front_template_url), approvedProduct.assetSet?.multiLinkFrontTemplateUrl],
    center_asset_url: [readString(databaseProduct.center_asset_url), approvedProduct.assetSet?.centerAssetUrl]
  };

  for (const field of FIELD_OWNERSHIP_POLICY.fillIfEmptyAssets) {
    const current = readString(databaseProduct[field]);
    if (current) {
      continue;
    }

    const candidate = candidates[field].map(readString).find(isTrustedAssetUrl);
    if (candidate) {
      updates.push({
        slug: approvedProduct.slug,
        field,
        value: candidate,
        action: "fill-if-empty"
      });
    } else if (field === "branded_angled_image_url" || field === "branded_front_template_url" || field === "multilink_front_template_url") {
      manual.push({
        slug: approvedProduct.slug,
        field,
        action: "manual-asset-required"
      });
    }
  }

  return { updates, manual };
}

export function formatReconciliationPlan(plan) {
  const lines = [
    "Catalog product sync is running in DRY-RUN mode.",
    `Approved active catalog products: ${plan.approvedProductCount}`,
    `Active backend products read: ${plan.databaseActiveProductCount}`,
    `Locked taxonomy: ${plan.lockedStandTypeCount} stand types, ${plan.lockedBusinessUseCount} business uses, ${plan.lockedPlatformCount} platforms`,
    `Missing approved products in backend: ${plan.missingProducts.length}`,
    `Backend-only active products: ${plan.dbOnlyProducts.length}`,
    `System-owned field mismatches: ${plan.fieldMismatches.filter((item) => item.owner === "system").length}`,
    `Admin-owned field differences preserved: ${plan.fieldMismatches.filter((item) => item.owner === "admin").length}`,
    `Option mismatches: ${plan.optionMismatches.length}`,
    `Business-use mismatches: ${plan.businessUseMismatches.length}`,
    `Fill-if-empty asset updates proposed: ${plan.fillIfEmptyAssetUpdates.length}`,
    `Manual asset requirements: ${plan.manualAssetRequirements.length}`,
    "Production writes performed: 0"
  ];

  if (plan.dbOnlyProducts.length > 0) {
    lines.push("Backend-only products:");
    for (const product of plan.dbOnlyProducts.slice(0, 12)) {
      lines.push(`- ${product.slug} (${product.status}, ${product.isActive ? "active" : "inactive"})`);
    }
  }

  if (plan.fillIfEmptyAssetUpdates.length > 0) {
    lines.push("First fill-if-empty asset proposals:");
    for (const update of plan.fillIfEmptyAssetUpdates.slice(0, 12)) {
      lines.push(`- ${update.slug}: ${update.field} <- ${update.value}`);
    }
  }

  return lines.join("\n");
}

async function main() {
  const args = parseSyncProductArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: npm run sync:products -- [--json] [--apply --confirm-fill-empty-assets|--confirm-product-sync]");
    console.log("Default mode is a read-only reconciliation dry-run.");
    console.log("--confirm-fill-empty-assets only fills empty asset URL fields.");
    console.log("--confirm-product-sync creates missing approved products, updates catalog-owned fields, options, business-use links, and archives retired storefront products.");
    return;
  }

  const backend = await connectBackend();
  const snapshot = await backend.readCatalogSnapshot();
  const plan = createCatalogReconciliationPlan(snapshot);

  if (args.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(formatReconciliationPlan(plan));
  }

  if (!args.apply) {
    return;
  }

  if (args.allowProductSync) {
    const result = await backend.applyProductCatalogSync({
      approvedProducts,
      productOptionsBySlug: new Map(approvedProducts.map((product) => [product.slug, getOptionsForProduct(product)]))
    });
    console.log(`Product catalog sync applied: ${JSON.stringify(result)}`);
    return;
  }

  if (!args.allowWrites) {
    throw new Error("Refusing to write. Re-run with --apply --confirm-fill-empty-assets or --apply --confirm-product-sync after architect approval.");
  }

  await backend.applyFillIfEmptyAssetUpdates(plan.fillIfEmptyAssetUpdates);
  console.log(`Safe fill-if-empty asset updates applied: ${plan.fillIfEmptyAssetUpdates.length}`);
}

async function connectBackend() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  if (databaseUrl) {
    return createNeonBackend(databaseUrl);
  }

  if (supabaseUrl && supabaseServiceKey) {
    return createSupabaseBackend(supabaseUrl, supabaseServiceKey);
  }

  throw new Error("No backend product database configuration found. Set DATABASE_URL/NEON_DATABASE_URL or Supabase service credentials.");
}

async function createNeonBackend(connectionString) {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(connectionString);

  return {
    async readCatalogSnapshot() {
      const [databaseProducts, productOptions, productBusinessUses] = await Promise.all([
        sql.query("select * from products order by slug", []),
        sql.query("select * from product_options order by product_slug, sort_order, option_code", []),
        sql.query("select * from product_business_uses order by product_slug, sort_order, business_use_slug", [])
      ]);

      return { databaseProducts, productOptions, productBusinessUses };
    },
    async applyFillIfEmptyAssetUpdates(updates) {
      for (const update of updates) {
        await sql.query(
          `
            update products
            set ${update.field} = $2, updated_at = now()
            where slug = $1 and (${update.field} is null or ${update.field} = '')
          `,
          [update.slug, update.value]
        );
      }
    },
    async applyProductCatalogSync({ approvedProducts, productOptionsBySlug }) {
      const existingProducts = await sql.query("select slug from products", []);
      const existingSlugs = new Set(existingProducts.map((row) => readString(row.slug)).filter(Boolean));
      let insertedProducts = 0;
      let updatedProducts = 0;
      let archivedProducts = 0;
      let replacedOptions = 0;
      let replacedBusinessUses = 0;

      for (const product of approvedProducts) {
        const isNew = !existingSlugs.has(product.slug);
        if (isNew) {
          await insertProductWithNeon(sql, product);
          insertedProducts += 1;
        } else {
          await updateProductSystemFieldsWithNeon(sql, product);
          updatedProducts += 1;
        }
        replacedOptions += await replaceProductOptionsWithNeon(sql, product.slug, productOptionsBySlug.get(product.slug) ?? []);
        replacedBusinessUses += await replaceProductBusinessUsesWithNeon(sql, product.slug, product.businessUseSlugs ?? []);
      }

      const archiveResult = await sql.query(
        `
          update products
          set status = 'archived', is_active = false, updated_at = now()
          where slug = 'multi-link-stand' and (status <> 'archived' or is_active is not false)
          returning slug
        `,
        []
      );
      archivedProducts = archiveResult.length;

      return { insertedProducts, updatedProducts, archivedProducts, replacedOptions, replacedBusinessUses };
    }
  };
}

async function createSupabaseBackend(supabaseUrl, serviceKey) {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return {
    async readCatalogSnapshot() {
      const [productsResult, optionsResult, businessUsesResult] = await Promise.all([
        client.from("products").select("*").order("slug", { ascending: true }),
        client.from("product_options").select("*").order("product_slug", { ascending: true }).order("sort_order", { ascending: true }),
        client.from("product_business_uses").select("*").order("product_slug", { ascending: true }).order("sort_order", { ascending: true })
      ]);

      for (const [table, result] of [
        ["products", productsResult],
        ["product_options", optionsResult],
        ["product_business_uses", businessUsesResult]
      ]) {
        if (result.error) {
          throw new Error(`${table}: ${result.error.message}`);
        }
      }

      return {
        databaseProducts: productsResult.data ?? [],
        productOptions: optionsResult.data ?? [],
        productBusinessUses: businessUsesResult.data ?? []
      };
    },
    async applyFillIfEmptyAssetUpdates(updates) {
      for (const update of updates) {
        const { error } = await client
          .from("products")
          .update({ [update.field]: update.value, updated_at: new Date().toISOString() })
          .eq("slug", update.slug)
          .or(`${update.field}.is.null,${update.field}.eq.`);
        if (error) {
          throw new Error(`products:${update.slug}:${update.field}: ${error.message}`);
        }
      }
    },
    async applyProductCatalogSync() {
      throw new Error("Product catalog sync is only implemented for direct Neon/DATABASE_URL connections.");
    }
  };
}

function canonicalProductValue(product, field) {
  const values = {
    title: product.title,
    sku: product.sku,
    category_slug: product.categorySlug,
    stand_type_slug: product.standTypeSlug ?? null,
    primary_platform_slug: product.primaryPlatformSlug ?? null,
    destination_type: product.destinationType ?? null,
    is_special_solution: product.isSpecialSolution ?? false,
    product_kind: product.productKind ?? "normal_direct",
    status: product.status ?? "active",
    base_price_cents: product.basePriceCents,
    sale_price_cents: product.salePriceCents ?? null,
    stock_status: product.stockStatus,
    short_description: product.shortDescription,
    description: product.description,
    product_type: product.productType,
    service_mode: product.serviceMode,
    checkout_mode: product.checkoutMode,
    requires_account: product.requiresAccount,
    requires_subscription: product.requiresSubscription,
    requires_landing_page: product.requiresLandingPage,
    supports_multilink: product.supportsMultiLink ?? false,
    supported_destinations: product.supportedDestinations ?? [],
    activation_type: product.activationType,
    included_service_label: product.includedServiceLabel,
    format: product.format,
    customization_options: product.customizationOptions ?? [],
    allows_logo_upload: product.allowsLogoUpload,
    allows_custom_design: product.allowsCustomDesign,
    design_mode: product.designMode,
    default_cta_text: product.defaultCtaText ?? null,
    cta_editable: product.ctaEditable ?? true,
    images: product.images ?? [],
    asset_readiness_status: product.assetReadinessStatus ?? "ready",
    seo_title: product.seoTitle ?? null,
    seo_description: product.seoDescription ?? null
  };

  return normalizeComparable(values[field]);
}

function productDatabaseRow(product, { includeAdminOwnedFields }) {
  const systemFields = {
    slug: product.slug,
    category_slug: product.categorySlug,
    stand_type_slug: product.standTypeSlug ?? null,
    primary_platform_slug: product.primaryPlatformSlug ?? null,
    destination_type: product.destinationType ?? null,
    is_special_solution: product.isSpecialSolution ?? false,
    product_kind: product.productKind ?? "normal_direct",
    product_type: product.productType,
    service_mode: product.serviceMode,
    checkout_mode: product.checkoutMode,
    requires_account: product.requiresAccount,
    requires_subscription: product.requiresSubscription,
    requires_landing_page: product.requiresLandingPage,
    supports_multilink: product.supportsMultiLink ?? false,
    supported_destinations: product.supportedDestinations ?? [],
    activation_type: product.activationType,
    included_service_label: product.includedServiceLabel,
    format: product.format,
    customization_options: product.customizationOptions ?? [],
    allows_logo_upload: product.allowsLogoUpload,
    allows_custom_design: product.allowsCustomDesign,
    design_mode: product.designMode,
    default_cta_text: product.defaultCtaText ?? null,
    cta_editable: product.ctaEditable ?? true,
    size_options: product.sizeOptions ?? [],
    color_options: product.colorOptions ?? [],
    key_features: product.keyFeatures ?? [],
    how_it_works: product.howItWorks ?? [],
    specifications: product.specifications ?? [],
    included_items: product.includedItems ?? [],
    product_faqs: product.productFaqs ?? [],
    is_active: product.isActive,
    updated_at: new Date().toISOString()
  };

  if (!includeAdminOwnedFields) {
    return systemFields;
  }

  return {
    ...systemFields,
    title: product.title,
    sku: product.sku,
    status: product.status ?? "active",
    base_price_cents: product.basePriceCents,
    sale_price_cents: product.salePriceCents ?? null,
    stock_status: product.stockStatus,
    short_description: product.shortDescription,
    description: product.description,
    display_text: product.displayText ?? null,
    images: product.images ?? [],
    standard_angled_image_url: product.assetSet?.standardAngledImageUrl ?? null,
    branded_angled_image_url: product.assetSet?.brandedAngledImageUrl ?? null,
    multilink_angled_image_url: product.assetSet?.multiLinkAngledImageUrl ?? null,
    standard_front_template_url: product.assetSet?.standardFrontTemplateUrl ?? null,
    branded_front_template_url: product.assetSet?.brandedFrontTemplateUrl ?? null,
    multilink_front_template_url: product.assetSet?.multiLinkFrontTemplateUrl ?? null,
    center_asset_url: product.assetSet?.centerAssetUrl ?? null,
    landing_page_preview_config: product.assetSet?.landingPagePreviewConfig ?? {},
    asset_readiness_status: product.assetReadinessStatus ?? "ready",
    seo_title: product.seoTitle ?? null,
    seo_description: product.seoDescription ?? null,
    search_keywords: product.searchKeywords ?? []
  };
}

async function insertProductWithNeon(sql, product) {
  const row = productDatabaseRow(product, { includeAdminOwnedFields: true });
  const columns = Object.keys(row);
  const params = columns.map((column) => prepareDatabaseParam(column, row[column]));
  const placeholders = columns.map((column, index) => placeholderForColumn(column, index + 1));
  const updateColumns = columns.filter((column) => column !== "slug");

  await sql.query(
    `
      insert into products (${columns.join(", ")})
      values (${placeholders.join(", ")})
      on conflict (slug) do update set ${updateColumns.map((column) => `${column} = excluded.${column}`).join(", ")}
    `,
    params
  );
}

async function updateProductSystemFieldsWithNeon(sql, product) {
  const row = productDatabaseRow(product, { includeAdminOwnedFields: false });
  const columns = Object.keys(row).filter((column) => column !== "slug");
  const params = columns.map((column) => prepareDatabaseParam(column, row[column]));
  params.push(product.slug);

  await sql.query(
    `
      update products
      set ${columns.map((column, index) => `${column} = ${placeholderForColumn(column, index + 1)}`).join(", ")}
      where slug = $${params.length}
    `,
    params
  );
}

async function replaceProductOptionsWithNeon(sql, productSlug, options) {
  await sql.query("delete from product_options where product_slug = $1", [productSlug]);
  if (options.length === 0) {
    return 0;
  }

  const rows = options.map((option) => ({
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

  await insertRowsWithNeon(sql, "product_options", rows);
  return rows.length;
}

async function replaceProductBusinessUsesWithNeon(sql, productSlug, businessUseSlugs) {
  await sql.query("delete from product_business_uses where product_slug = $1", [productSlug]);
  const rows = Array.from(new Set(businessUseSlugs)).map((businessUseSlug, index) => ({
    product_slug: productSlug,
    business_use_slug: businessUseSlug,
    sort_order: (index + 1) * 10
  }));
  if (rows.length === 0) {
    return 0;
  }

  await insertRowsWithNeon(sql, "product_business_uses", rows);
  return rows.length;
}

async function insertRowsWithNeon(sql, table, rows) {
  const columns = Object.keys(rows[0]);
  const params = [];
  const groups = rows.map((row) => {
    const placeholders = columns.map((column) => {
      params.push(prepareDatabaseParam(column, row[column]));
      return placeholderForColumn(column, params.length);
    });
    return `(${placeholders.join(", ")})`;
  });
  await sql.query(`insert into ${table} (${columns.join(", ")}) values ${groups.join(", ")}`, params);
}

function prepareDatabaseParam(column, value) {
  if (jsonbSyncColumns.has(column)) {
    return JSON.stringify(value ?? null);
  }
  return value;
}

function placeholderForColumn(column, index) {
  if (jsonbSyncColumns.has(column)) {
    return `$${index}::jsonb`;
  }

  if (textArraySyncColumns.has(column)) {
    return `$${index}::text[]`;
  }

  return `$${index}`;
}

const jsonbSyncColumns = new Set([
  "images",
  "landing_page_preview_config",
  "size_options",
  "color_options",
  "key_features",
  "how_it_works",
  "specifications",
  "included_items",
  "product_faqs"
]);

const textArraySyncColumns = new Set(["supported_destinations", "customization_options", "search_keywords"]);

function getOptionsForProduct(product) {
  return product.purchaseOptions ?? getDefaultOptionsForProductKind(product.productKind ?? "normal_direct");
}

function groupRowsBy(rows, field) {
  const grouped = new Map();
  for (const row of rows) {
    const key = readString(row[field]);
    if (!key) {
      continue;
    }
    const items = grouped.get(key) ?? [];
    items.push(row);
    grouped.set(key, items);
  }
  return grouped;
}

function normalizeComparable(value) {
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeComparable);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([first], [second]) => first.localeCompare(second)));
  }
  return value;
}

function areComparableValuesEqual(first, second) {
  return JSON.stringify(normalizeComparable(first)) === JSON.stringify(normalizeComparable(second));
}

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function readImageAt(value, index) {
  if (typeof value === "string") {
    try {
      return readImageAt(JSON.parse(value), index);
    } catch {
      return undefined;
    }
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  return readString(value[index]?.src);
}

function isTrustedAssetUrl(value) {
  if (!value) {
    return false;
  }

  return (
    value.startsWith("/") &&
    !/placeholder|draft|temporary|temp-media|missing/i.test(value) &&
    /\.(png|jpg|jpeg|webp|avif)$/i.test(value)
  );
}

function loadEnvFile(filePath) {
  try {
    const env = readFileSync(filePath, "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // The runtime environment may provide variables without a local env file.
  }
}

function loadTsExports(relativePath) {
  const filePath = resolve(rootDir, relativePath);
  const source = readFileSync(filePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filePath
  });
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === "@/data/migrated-products") {
      return loadTsExports("src/data/migrated-products.ts");
    }
    if (specifier === "@/lib/catalog-architecture") {
      return loadTsExports("src/lib/catalog-architecture.ts");
    }
    return require(specifier);
  };
  new Function("exports", "require", "module", "__filename", "__dirname", outputText)(
    module.exports,
    localRequire,
    module,
    filePath,
    dirname(filePath)
  );
  return module.exports;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
