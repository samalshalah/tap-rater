import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

loadEnvFile(resolve(rootDir, ".env.local"));

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

const {
  catalogCategories,
  migratedProducts
} = loadTsExports("src/data/migrated-products.ts");

const {
  getDefaultOptionsForProductKind,
  lockedBusinessUses,
  lockedPlatforms,
  lockedStandTypes
} = loadTsExports("src/lib/catalog-architecture.ts");

const activeProducts = migratedProducts.filter((product) => product.isActive);
const legacyDestinationAliases = [
  "booking",
  "custom",
  "feedback",
  "loyalty-url",
  "menu",
  "payment-url",
  "referral",
  "wifi"
];
const supportedDestinations = Array.from(
  new Set([
    ...migratedProducts.flatMap((product) => product.supportedDestinations ?? []),
    ...lockedPlatforms.map((platform) => platform.slug),
    ...legacyDestinationAliases
  ])
).sort();

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (databaseUrl) {
  await syncNeon(databaseUrl);
} else if (supabaseUrl && supabaseServiceKey) {
  await syncSupabase(supabaseUrl, supabaseServiceKey);
} else {
  throw new Error("No backend product database configuration found. Set DATABASE_URL/NEON_DATABASE_URL or Supabase service credentials.");
}

console.log(`Catalog sync complete: ${activeProducts.length} active products from system data.`);

async function syncNeon(connectionString) {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(connectionString);
  const supportedDestinationSql = supportedDestinations.map(sqlStringLiteral).join(", ");

  await sql.query("alter table products drop constraint if exists products_supported_destinations_check", []);
  await sql.query(
    `alter table products add constraint products_supported_destinations_check check (supported_destinations <@ array[${supportedDestinationSql}]::text[])`,
    []
  );

  for (const standType of lockedStandTypes) {
    await sql.query(
      `
        insert into stand_types (
          slug, title, description, short_description, long_content, buyer_intent,
          seo_title, seo_description, image_url, banner_image_url, sort_order, is_active, updated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
        on conflict (slug) do update set
          title = excluded.title,
          description = excluded.description,
          short_description = excluded.short_description,
          long_content = excluded.long_content,
          buyer_intent = excluded.buyer_intent,
          seo_title = excluded.seo_title,
          seo_description = excluded.seo_description,
          image_url = excluded.image_url,
          banner_image_url = excluded.banner_image_url,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = now()
      `,
      [
        standType.slug,
        standType.title,
        standType.description,
        standType.shortDescription ?? standType.description,
        standType.longContent ?? standType.description,
        standType.buyerIntent ?? standType.title,
        standType.seoTitle ?? null,
        standType.seoDescription ?? null,
        standType.imageUrl ?? null,
        standType.bannerImageUrl ?? null,
        standType.sortOrder,
        standType.isActive
      ]
    );
  }

  for (const businessUse of lockedBusinessUses) {
    await sql.query(
      `
        insert into business_uses (
          slug, title, description, short_description, long_content,
          seo_title, seo_description, image_url, banner_image_url, sort_order, is_active, updated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
        on conflict (slug) do update set
          title = excluded.title,
          description = excluded.description,
          short_description = excluded.short_description,
          long_content = excluded.long_content,
          seo_title = excluded.seo_title,
          seo_description = excluded.seo_description,
          image_url = excluded.image_url,
          banner_image_url = excluded.banner_image_url,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = now()
      `,
      [
        businessUse.slug,
        businessUse.title,
        businessUse.description,
        businessUse.shortDescription ?? businessUse.description,
        businessUse.longContent ?? businessUse.description,
        businessUse.seoTitle ?? null,
        businessUse.seoDescription ?? null,
        businessUse.imageUrl ?? null,
        businessUse.bannerImageUrl ?? null,
        businessUse.sortOrder,
        businessUse.isActive
      ]
    );
  }

  for (const platform of lockedPlatforms) {
    await sql.query(
      `
        insert into platforms (
          slug, title, destination_type, icon_url, google_places_enabled, manual_url_allowed, is_active, updated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,now())
        on conflict (slug) do update set
          title = excluded.title,
          destination_type = excluded.destination_type,
          icon_url = excluded.icon_url,
          google_places_enabled = excluded.google_places_enabled,
          manual_url_allowed = excluded.manual_url_allowed,
          is_active = excluded.is_active,
          updated_at = now()
      `,
      [
        platform.slug,
        platform.title,
        platform.destinationType,
        platform.iconUrl ?? null,
        platform.googlePlacesEnabled,
        platform.manualUrlAllowed,
        platform.isActive
      ]
    );
  }

  for (const product of activeProducts) {
    const productOptions = getOptionsForProduct(product);
    await upsertNeonProduct(sql, product);
    await sql.query("delete from product_business_uses where product_slug = $1", [product.slug]);
    for (const [index, businessUseSlug] of Array.from(new Set(product.businessUseSlugs ?? [])).entries()) {
      await sql.query(
        `
          insert into product_business_uses (product_slug, business_use_slug, sort_order)
          values ($1,$2,$3)
          on conflict (product_slug, business_use_slug) do update set sort_order = excluded.sort_order
        `,
        [product.slug, businessUseSlug, (index + 1) * 10]
      );
    }
    await sql.query("delete from product_options where product_slug = $1 and not (option_code = any($2::text[]))", [
      product.slug,
      productOptions.map((option) => option.optionCode)
    ]);
    for (const option of productOptions) {
      await upsertNeonProductOption(sql, product.slug, option);
    }
  }

  const rows = await sql.query("select count(*)::int as count from products where is_active = true", []);
  const verification = await sql.query(
    "select slug from products where slug = any($1::text[]) order by slug",
    [activeProducts.map((product) => product.slug)]
  );
  console.log(`Backend active product rows: ${rows[0]?.count ?? 0}.`);
  console.log(`Verified synced product slugs: ${verification.length}.`);
}

async function upsertNeonProduct(sql, product) {
  await sql.query(
    `
      insert into products (
        slug, title, sku, category_slug, stand_type_slug, primary_platform_slug, destination_type,
        is_special_solution, product_kind, status, base_price_cents, sale_price_cents, stock_status,
        short_description, description, product_type, service_mode, checkout_mode, requires_account,
        requires_subscription, requires_landing_page, supported_destinations, activation_type,
        included_service_label, format, customization_options, allows_logo_upload, allows_custom_design,
        design_mode, images, standard_angled_image_url, branded_angled_image_url, multilink_angled_image_url,
        standard_front_template_url, branded_front_template_url, multilink_front_template_url, center_asset_url,
        default_cta_text, cta_editable, landing_page_preview_config, asset_readiness_status,
        seo_title, seo_description, is_active, updated_at
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::text[],
        $23,$24,$25,$26::text[],$27,$28,$29,$30::jsonb,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40::jsonb,
        $41,$42,$43,$44,now()
      )
      on conflict (slug) do update set
        title = excluded.title,
        sku = excluded.sku,
        category_slug = excluded.category_slug,
        stand_type_slug = excluded.stand_type_slug,
        primary_platform_slug = excluded.primary_platform_slug,
        destination_type = excluded.destination_type,
        is_special_solution = excluded.is_special_solution,
        product_kind = excluded.product_kind,
        status = excluded.status,
        base_price_cents = excluded.base_price_cents,
        sale_price_cents = excluded.sale_price_cents,
        stock_status = excluded.stock_status,
        short_description = excluded.short_description,
        description = excluded.description,
        product_type = excluded.product_type,
        service_mode = excluded.service_mode,
        checkout_mode = excluded.checkout_mode,
        requires_account = excluded.requires_account,
        requires_subscription = excluded.requires_subscription,
        requires_landing_page = excluded.requires_landing_page,
        supported_destinations = excluded.supported_destinations,
        activation_type = excluded.activation_type,
        included_service_label = excluded.included_service_label,
        format = excluded.format,
        customization_options = excluded.customization_options,
        allows_logo_upload = excluded.allows_logo_upload,
        allows_custom_design = excluded.allows_custom_design,
        design_mode = excluded.design_mode,
        images = excluded.images,
        standard_angled_image_url = excluded.standard_angled_image_url,
        branded_angled_image_url = excluded.branded_angled_image_url,
        multilink_angled_image_url = excluded.multilink_angled_image_url,
        standard_front_template_url = excluded.standard_front_template_url,
        branded_front_template_url = excluded.branded_front_template_url,
        multilink_front_template_url = excluded.multilink_front_template_url,
        center_asset_url = excluded.center_asset_url,
        default_cta_text = excluded.default_cta_text,
        cta_editable = excluded.cta_editable,
        landing_page_preview_config = excluded.landing_page_preview_config,
        asset_readiness_status = excluded.asset_readiness_status,
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        is_active = excluded.is_active,
        updated_at = now()
    `,
    [
      product.slug,
      product.title,
      product.sku,
      product.categorySlug,
      product.standTypeSlug ?? null,
      product.primaryPlatformSlug ?? null,
      product.destinationType ?? null,
      product.isSpecialSolution ?? false,
      product.productKind ?? "normal_direct",
      product.status ?? "active",
      product.basePriceCents,
      product.salePriceCents ?? null,
      product.stockStatus,
      product.shortDescription,
      product.description,
      product.productType,
      product.serviceMode,
      product.checkoutMode,
      product.requiresAccount,
      product.requiresSubscription,
      product.requiresLandingPage,
      product.supportedDestinations ?? [],
      product.activationType,
      product.includedServiceLabel,
      product.format,
      product.customizationOptions ?? [],
      product.allowsLogoUpload,
      product.allowsCustomDesign,
      product.designMode,
      JSON.stringify(product.images ?? []),
      product.assetSet?.standardAngledImageUrl ?? null,
      product.assetSet?.brandedAngledImageUrl ?? null,
      product.assetSet?.multiLinkAngledImageUrl ?? null,
      product.assetSet?.standardFrontTemplateUrl ?? null,
      product.assetSet?.brandedFrontTemplateUrl ?? null,
      product.assetSet?.multiLinkFrontTemplateUrl ?? null,
      product.assetSet?.centerAssetUrl ?? null,
      product.defaultCtaText ?? null,
      product.ctaEditable ?? true,
      JSON.stringify(product.assetSet?.landingPagePreviewConfig ?? {}),
      product.assetReadinessStatus ?? "ready",
      product.seoTitle ?? null,
      product.seoDescription ?? null,
      product.isActive
    ]
  );
}

async function upsertNeonProductOption(sql, productSlug, option) {
  await sql.query(
    `
      insert into product_options (
        product_slug, option_code, title, description, price_cents, monthly_price_cents, max_links,
        requires_destination_url, has_qr, requires_logo, requires_business_name, requires_design_step,
        requires_front_proof, requires_subscription, account_required, supports_reorderable_links,
        supports_link_visibility, landing_page_url_pattern, footer_label, is_active, sort_order, updated_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now())
      on conflict (product_slug, option_code) do update set
        title = excluded.title,
        description = excluded.description,
        price_cents = excluded.price_cents,
        monthly_price_cents = excluded.monthly_price_cents,
        max_links = excluded.max_links,
        requires_destination_url = excluded.requires_destination_url,
        has_qr = excluded.has_qr,
        requires_logo = excluded.requires_logo,
        requires_business_name = excluded.requires_business_name,
        requires_design_step = excluded.requires_design_step,
        requires_front_proof = excluded.requires_front_proof,
        requires_subscription = excluded.requires_subscription,
        account_required = excluded.account_required,
        supports_reorderable_links = excluded.supports_reorderable_links,
        supports_link_visibility = excluded.supports_link_visibility,
        landing_page_url_pattern = excluded.landing_page_url_pattern,
        footer_label = excluded.footer_label,
        is_active = excluded.is_active,
        sort_order = excluded.sort_order,
        updated_at = now()
    `,
    [
      productSlug,
      option.optionCode,
      option.title,
      option.description,
      option.priceCents,
      option.monthlyPriceCents ?? null,
      option.maxLinks ?? null,
      option.requiresDestinationUrl,
      option.hasQr,
      option.requiresLogo,
      option.requiresBusinessName,
      option.requiresDesignStep,
      option.requiresFrontProof,
      option.requiresSubscription,
      option.accountRequired,
      option.supportsReorderableLinks,
      option.supportsLinkVisibility,
      option.landingPageUrlPattern ?? null,
      option.footerLabel ?? null,
      option.isActive,
      option.sortOrder
    ]
  );
}

async function syncSupabase(supabaseUrl, serviceKey) {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  await upsertSupabase(client, "stand_types", lockedStandTypes.map(toStandTypeRow));
  await upsertSupabase(client, "business_uses", lockedBusinessUses.map(toBusinessUseRow));
  await upsertSupabase(client, "platforms", lockedPlatforms.map(toPlatformRow));

  for (const product of activeProducts) {
    await upsertSupabase(client, "products", [toProductRow(product)]);
    await deleteSupabase(client, "product_business_uses", "product_slug", product.slug);
    const businessUseRows = Array.from(new Set(product.businessUseSlugs ?? [])).map((businessUseSlug, index) => ({
      product_slug: product.slug,
      business_use_slug: businessUseSlug,
      sort_order: (index + 1) * 10
    }));
    if (businessUseRows.length > 0) {
      await insertSupabase(client, "product_business_uses", businessUseRows);
    }
    const options = getOptionsForProduct(product);
    if (options.length > 0) {
      await upsertSupabase(client, "product_options", options.map((option) => toProductOptionRow(product.slug, option)), "product_slug,option_code");
    }
  }

  const { count, error } = await client.from("products").select("slug", { count: "exact", head: true }).eq("is_active", true);
  if (error) {
    throw new Error(error.message);
  }
  console.log(`Backend active product rows: ${count ?? 0}.`);
  console.log(`Verified synced product slugs: ${activeProducts.length}.`);
}

async function upsertSupabase(client, table, rows, onConflict = "slug") {
  if (rows.length === 0) {
    return;
  }
  const { error } = await client.from(table).upsert(rows, { onConflict });
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function insertSupabase(client, table, rows) {
  const { error } = await client.from(table).insert(rows);
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function deleteSupabase(client, table, column, value) {
  const { error } = await client.from(table).delete().eq(column, value);
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

function toStandTypeRow(standType) {
  return {
    slug: standType.slug,
    title: standType.title,
    description: standType.description,
    short_description: standType.shortDescription ?? standType.description,
    long_content: standType.longContent ?? standType.description,
    buyer_intent: standType.buyerIntent ?? standType.title,
    seo_title: standType.seoTitle ?? null,
    seo_description: standType.seoDescription ?? null,
    image_url: standType.imageUrl ?? null,
    banner_image_url: standType.bannerImageUrl ?? null,
    sort_order: standType.sortOrder,
    is_active: standType.isActive,
    updated_at: new Date().toISOString()
  };
}

function toBusinessUseRow(businessUse) {
  return {
    slug: businessUse.slug,
    title: businessUse.title,
    description: businessUse.description,
    short_description: businessUse.shortDescription ?? businessUse.description,
    long_content: businessUse.longContent ?? businessUse.description,
    seo_title: businessUse.seoTitle ?? null,
    seo_description: businessUse.seoDescription ?? null,
    image_url: businessUse.imageUrl ?? null,
    banner_image_url: businessUse.bannerImageUrl ?? null,
    sort_order: businessUse.sortOrder,
    is_active: businessUse.isActive,
    updated_at: new Date().toISOString()
  };
}

function toPlatformRow(platform) {
  return {
    slug: platform.slug,
    title: platform.title,
    destination_type: platform.destinationType,
    icon_url: platform.iconUrl ?? null,
    google_places_enabled: platform.googlePlacesEnabled,
    manual_url_allowed: platform.manualUrlAllowed,
    is_active: platform.isActive,
    updated_at: new Date().toISOString()
  };
}

function toProductRow(product) {
  return {
    slug: product.slug,
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
    supported_destinations: product.supportedDestinations ?? [],
    activation_type: product.activationType,
    included_service_label: product.includedServiceLabel,
    format: product.format,
    customization_options: product.customizationOptions ?? [],
    allows_logo_upload: product.allowsLogoUpload,
    allows_custom_design: product.allowsCustomDesign,
    design_mode: product.designMode,
    images: product.images ?? [],
    standard_angled_image_url: product.assetSet?.standardAngledImageUrl ?? null,
    branded_angled_image_url: product.assetSet?.brandedAngledImageUrl ?? null,
    multilink_angled_image_url: product.assetSet?.multiLinkAngledImageUrl ?? null,
    standard_front_template_url: product.assetSet?.standardFrontTemplateUrl ?? null,
    branded_front_template_url: product.assetSet?.brandedFrontTemplateUrl ?? null,
    multilink_front_template_url: product.assetSet?.multiLinkFrontTemplateUrl ?? null,
    center_asset_url: product.assetSet?.centerAssetUrl ?? null,
    default_cta_text: product.defaultCtaText ?? null,
    cta_editable: product.ctaEditable ?? true,
    landing_page_preview_config: product.assetSet?.landingPagePreviewConfig ?? {},
    asset_readiness_status: product.assetReadinessStatus ?? "ready",
    seo_title: product.seoTitle ?? null,
    seo_description: product.seoDescription ?? null,
    is_active: product.isActive,
    updated_at: new Date().toISOString()
  };
}

function toProductOptionRow(productSlug, option) {
  return {
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
    sort_order: option.sortOrder,
    updated_at: new Date().toISOString()
  };
}

function getOptionsForProduct(product) {
  return product.purchaseOptions ?? getDefaultOptionsForProductKind(product.productKind ?? "normal_direct");
}

function sqlStringLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
