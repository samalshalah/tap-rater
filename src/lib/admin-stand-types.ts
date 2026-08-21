import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { lockedStandTypes, type StandType } from "@/lib/catalog-architecture";
import { standTypeColumns } from "@/lib/catalog-architecture-repository";
import type { StandTypeContentInput } from "@/lib/validators";

type AdminStandTypeClient = {
  from: (table: string) => any;
};

export function createBlankStandType(): StandType {
  return {
    slug: "",
    title: "",
    description: "",
    shortDescription: "",
    longContent: "",
    buyerIntent: "",
    seoTitle: "",
    seoDescription: "",
    imageUrl: "",
    bannerImageUrl: "",
    sortOrder: 0,
    isActive: false
  };
}

export async function getAdminStandTypes(): Promise<StandType[]> {
  if (!hasSupabaseAdminConfig()) {
    return lockedStandTypes;
  }

  return getAdminStandTypesFromClient(getSupabaseAdmin() as AdminStandTypeClient);
}

export async function getAdminStandTypeBySlug(slug: string): Promise<StandType | undefined> {
  const standTypes = await getAdminStandTypes();
  return standTypes.find((standType) => standType.slug === slug);
}

export async function getAdminStandTypesFromClient(client: AdminStandTypeClient): Promise<StandType[]> {
  const { data, error } = await client.from("stand_types").select(standTypeColumns).order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map(normalizeStandType).filter((standType): standType is StandType => Boolean(standType));
}

export async function getPublicStandTypes(): Promise<StandType[]> {
  if (!hasSupabaseAdminConfig()) {
    return lockedStandTypes.filter((standType) => standType.isActive);
  }

  const standTypes = await getAdminStandTypesFromClient(getSupabaseAdmin() as AdminStandTypeClient);
  return standTypes.filter((standType) => standType.isActive);
}

export async function getPublicStandTypeBySlug(slug: string): Promise<StandType | undefined> {
  const standTypes = await getPublicStandTypes();
  return standTypes.find((standType) => standType.slug === slug);
}

export async function saveStandTypeContent(client: AdminStandTypeClient, input: StandTypeContentInput) {
  if (input.originalSlug && input.originalSlug !== input.slug) {
    throw new Error("Existing stand-type slugs cannot be changed after creation.");
  }

  const { error } = await client.from("stand_types").upsert(
    {
      slug: input.slug,
      title: input.title,
      description: input.description,
      short_description: input.shortDescription,
      long_content: input.longContent,
      buyer_intent: input.buyerIntent,
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
      image_url: input.imageUrl ?? null,
      banner_image_url: input.bannerImageUrl ?? null,
      sort_order: input.sortOrder,
      is_active: input.isActive,
      updated_at: new Date().toISOString()
    },
    { onConflict: "slug" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeStandType(row: unknown): StandType | null {
  const record = row && typeof row === "object" ? row as Record<string, unknown> : {};
  const slug = readString(record.slug);
  const title = readString(record.title);
  if (!slug || !title) {
    return null;
  }

  return {
    id: readString(record.id),
    slug,
    title,
    description: readString(record.description) ?? "",
    shortDescription: readString(record.short_description),
    longContent: readString(record.long_content),
    buyerIntent: readString(record.buyer_intent),
    seoTitle: readString(record.seo_title),
    seoDescription: readString(record.seo_description),
    imageUrl: readString(record.image_url),
    bannerImageUrl: readString(record.banner_image_url),
    sortOrder: readNumber(record.sort_order) ?? 0,
    isActive: readBoolean(record.is_active) ?? false
  };
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
