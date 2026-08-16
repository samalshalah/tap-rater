import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import {
  brandedQrDirectProductOption,
  hostedMultiLinkProductOption,
  lockedBusinessUses,
  lockedPlatforms,
  lockedProductOptionTemplates,
  lockedStandTypes,
  standardDirectProductOption,
  type BusinessUse,
  type BusinessUseSlug,
  type PlatformDestination,
  type PlatformDestinationType,
  type ProductOption,
  type ProductOptionCode,
  type StandType,
  type StandTypeSlug
} from "@/lib/catalog-architecture";

type QueryResult = PromiseLike<{ data: unknown[] | null; error: null | { message: string } }>;
type ArchitectureQueryBuilder = QueryResult & {
  eq: (column: string, value: unknown) => ArchitectureQueryBuilder;
  order: (column: string, options: { ascending: boolean }) => ArchitectureQueryBuilder;
};

type ArchitectureClient = {
  from: (table: string) => {
    select: (columns?: string) => ArchitectureQueryBuilder;
  };
};

const standTypeColumns = "id,slug,title,description,image_url,sort_order,is_active";
const businessUseColumns = "id,slug,title,description,image_url,sort_order,is_active";
const platformColumns = "id,slug,title,destination_type,icon_url,google_places_enabled,manual_url_allowed,is_active";
const productOptionColumns = [
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
const productOptionTemplateColumns = [
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

export async function getStandTypes(): Promise<StandType[]> {
  noStore();
  return readArchitectureRows("stand_types", standTypeColumns, normalizeStandTypeRow, lockedStandTypes);
}

export async function getBusinessUses(): Promise<BusinessUse[]> {
  noStore();
  return readArchitectureRows("business_uses", businessUseColumns, normalizeBusinessUseRow, lockedBusinessUses);
}

export async function getPlatforms(): Promise<PlatformDestination[]> {
  noStore();
  return readArchitectureRows("platforms", platformColumns, normalizePlatformRow, lockedPlatforms);
}

export async function getProductOptionTemplates(): Promise<ProductOption[]> {
  noStore();
  return readArchitectureRows("product_option_templates", productOptionTemplateColumns, normalizeProductOptionRow, lockedProductOptionTemplates);
}

export async function getProductOptions(productSlug: string): Promise<ProductOption[]> {
  noStore();

  if (!hasSupabaseAdminConfig()) {
    return [];
  }

  try {
    return await getProductOptionsFromClient(getSupabaseAdmin() as ArchitectureClient, productSlug);
  } catch {
    return [];
  }
}

export async function getProductOptionsFromClient(client: ArchitectureClient, productSlug: string): Promise<ProductOption[]> {
  const { data, error } = await client
    .from("product_options")
    .select(productOptionColumns)
    .eq("product_slug", productSlug)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map(normalizeProductOptionRow)
    .filter((option): option is ProductOption => Boolean(option?.isActive))
    .sort((first, second) => first.sortOrder - second.sortOrder);
}

export function getDefaultOptionsForProductKind(productKind: "normal_direct" | "custom_direct" | "hosted_multilink" | "bundle"): ProductOption[] {
  if (productKind === "hosted_multilink") {
    return [hostedMultiLinkProductOption];
  }

  if (productKind === "custom_direct") {
    return [brandedQrDirectProductOption];
  }

  if (productKind === "bundle") {
    return [];
  }

  return [standardDirectProductOption, brandedQrDirectProductOption];
}

async function readArchitectureRows<T>(
  table: string,
  columns: string,
  normalize: (row: unknown) => T | null,
  fallback: T[]
): Promise<T[]> {
  if (!hasSupabaseAdminConfig()) {
    return fallback;
  }

  try {
    const { data, error } = await (getSupabaseAdmin() as ArchitectureClient)
      .from(table)
      .select(columns)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return fallback;
    }

    const rows = data.map(normalize).filter((item): item is T => Boolean(item));
    return rows.length > 0 ? rows : fallback;
  } catch {
    return fallback;
  }
}

function normalizeStandTypeRow(row: unknown): StandType | null {
  const record = readRecord(row);
  const slug = readStandTypeSlug(record.slug);
  const title = readString(record.title);
  if (!slug || !title) return null;

  return {
    id: readString(record.id),
    slug,
    title,
    description: readString(record.description) ?? "",
    imageUrl: readString(record.image_url),
    sortOrder: readNumber(record.sort_order) ?? 0,
    isActive: readBoolean(record.is_active) ?? true
  };
}

function normalizeBusinessUseRow(row: unknown): BusinessUse | null {
  const record = readRecord(row);
  const slug = readBusinessUseSlug(record.slug);
  const title = readString(record.title);
  if (!slug || !title) return null;

  return {
    id: readString(record.id),
    slug,
    title,
    description: readString(record.description) ?? "",
    imageUrl: readString(record.image_url),
    sortOrder: readNumber(record.sort_order) ?? 0,
    isActive: readBoolean(record.is_active) ?? true
  };
}

function normalizePlatformRow(row: unknown): PlatformDestination | null {
  const record = readRecord(row);
  const slug = readString(record.slug);
  const title = readString(record.title);
  const destinationType = readPlatformDestinationType(record.destination_type);
  if (!slug || !title || !destinationType) return null;

  return {
    id: readString(record.id),
    slug,
    title,
    destinationType,
    iconUrl: readString(record.icon_url),
    googlePlacesEnabled: readBoolean(record.google_places_enabled) ?? false,
    manualUrlAllowed: readBoolean(record.manual_url_allowed) ?? true,
    isActive: readBoolean(record.is_active) ?? true
  };
}

export function normalizeProductOptionRow(row: unknown): ProductOption | null {
  const record = readRecord(row);
  const optionCode = readProductOptionCode(record.option_code);
  const title = readString(record.title);
  const priceCents = readNumber(record.price_cents);
  if (!optionCode || !title || priceCents === undefined) return null;

  return {
    id: readString(record.id),
    productSlug: readString(record.product_slug),
    optionCode,
    title,
    description: readString(record.description) ?? "",
    priceCents,
    monthlyPriceCents: readNumber(record.monthly_price_cents),
    maxLinks: readNumber(record.max_links),
    requiresDestinationUrl: readBoolean(record.requires_destination_url) ?? true,
    hasQr: readBoolean(record.has_qr) ?? false,
    requiresLogo: readBoolean(record.requires_logo) ?? false,
    requiresBusinessName: readBoolean(record.requires_business_name) ?? false,
    requiresDesignStep: readBoolean(record.requires_design_step) ?? false,
    requiresFrontProof: readBoolean(record.requires_front_proof) ?? false,
    requiresSubscription: readBoolean(record.requires_subscription) ?? false,
    accountRequired: readBoolean(record.account_required) ?? false,
    supportsReorderableLinks: readBoolean(record.supports_reorderable_links) ?? false,
    supportsLinkVisibility: readBoolean(record.supports_link_visibility) ?? false,
    landingPageUrlPattern: readString(record.landing_page_url_pattern),
    footerLabel: readString(record.footer_label),
    isActive: readBoolean(record.is_active) ?? true,
    sortOrder: readNumber(record.sort_order) ?? 0
  };
}

function readRecord(row: unknown): Record<string, unknown> {
  return row && typeof row === "object" ? (row as Record<string, unknown>) : {};
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

function readStandTypeSlug(value: unknown): StandTypeSlug | undefined {
  return lockedStandTypes.some((standType) => standType.slug === value) ? (value as StandTypeSlug) : undefined;
}

function readBusinessUseSlug(value: unknown): BusinessUseSlug | undefined {
  return lockedBusinessUses.some((businessUse) => businessUse.slug === value) ? (value as BusinessUseSlug) : undefined;
}

function readProductOptionCode(value: unknown): ProductOptionCode | undefined {
  return value === "standard_direct" || value === "branded_qr_direct" || value === "hosted_multilink" ? value : undefined;
}

function readPlatformDestinationType(value: unknown): PlatformDestinationType | undefined {
  const destinationTypes: PlatformDestinationType[] = [
    "review",
    "review_social",
    "booking",
    "menu",
    "menu_order",
    "order",
    "reservation",
    "website",
    "social",
    "payment",
    "loyalty",
    "custom"
  ];

  return destinationTypes.includes(value as PlatformDestinationType) ? (value as PlatformDestinationType) : undefined;
}
