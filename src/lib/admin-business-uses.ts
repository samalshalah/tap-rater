import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { lockedBusinessUses, type BusinessUse } from "@/lib/catalog-architecture";
import { businessUseColumns } from "@/lib/catalog-architecture-repository";
import type { BusinessUseContentInput } from "@/lib/validators";

type AdminBusinessUseClient = {
  from: (table: string) => any;
};

export type AdminBusinessUse = BusinessUse & {
  productSlugs: string[];
};

export function createBlankBusinessUse(): AdminBusinessUse {
  return {
    slug: "",
    title: "",
    description: "",
    shortDescription: "",
    longContent: "",
    seoTitle: "",
    seoDescription: "",
    imageUrl: "",
    bannerImageUrl: "",
    sortOrder: 0,
    isActive: false,
    productSlugs: []
  };
}

export async function getAdminBusinessUses(): Promise<AdminBusinessUse[]> {
  if (!hasSupabaseAdminConfig()) {
    return lockedBusinessUses.map((businessUse) => ({ ...businessUse, productSlugs: [] }));
  }

  return getAdminBusinessUsesFromClient(getSupabaseAdmin() as AdminBusinessUseClient);
}

export async function getAdminBusinessUseBySlug(slug: string): Promise<AdminBusinessUse | undefined> {
  const businessUses = await getAdminBusinessUses();
  return businessUses.find((businessUse) => businessUse.slug === slug);
}

export async function getAdminBusinessUsesFromClient(client: AdminBusinessUseClient): Promise<AdminBusinessUse[]> {
  const { data, error } = await client.from("business_uses").select(businessUseColumns).order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) {
    return [];
  }

  const productSlugsByBusinessUse = await getProductSlugsByBusinessUse(client);
  return data.map(normalizeBusinessUse).filter((businessUse): businessUse is BusinessUse => Boolean(businessUse)).map((businessUse) => ({
    ...businessUse,
    productSlugs: productSlugsByBusinessUse.get(businessUse.slug) ?? []
  }));
}

export async function getPublicBusinessUses(): Promise<AdminBusinessUse[]> {
  if (!hasSupabaseAdminConfig()) {
    return lockedBusinessUses.filter((businessUse) => businessUse.isActive).map((businessUse) => ({ ...businessUse, productSlugs: [] }));
  }

  const businessUses = await getAdminBusinessUsesFromClient(getSupabaseAdmin() as AdminBusinessUseClient);
  return businessUses.filter((businessUse) => businessUse.isActive);
}

export async function getPublicBusinessUseBySlug(slug: string): Promise<AdminBusinessUse | undefined> {
  const businessUses = await getPublicBusinessUses();
  return businessUses.find((businessUse) => businessUse.slug === slug);
}

export async function saveBusinessUseContent(client: AdminBusinessUseClient, input: BusinessUseContentInput) {
  if (input.originalSlug && input.originalSlug !== input.slug) {
    throw new Error("Existing business-use slugs cannot be changed after creation.");
  }

  const { error } = await client.from("business_uses").upsert(
    {
      slug: input.slug,
      title: input.title,
      description: input.description,
      short_description: input.shortDescription,
      long_content: input.longContent,
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

  await replaceBusinessUseProducts(client, input.slug, input.productSlugs);
}

async function replaceBusinessUseProducts(client: AdminBusinessUseClient, businessUseSlug: string, productSlugs: string[]) {
  const deleteResult = await client.from("product_business_uses").delete().eq("business_use_slug", businessUseSlug);
  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  const rows = Array.from(new Set(productSlugs)).map((productSlug, index) => ({
    product_slug: productSlug,
    business_use_slug: businessUseSlug,
    sort_order: (index + 1) * 10
  }));

  if (rows.length === 0) {
    return;
  }

  const insertResult = await client.from("product_business_uses").insert(rows);
  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
}

async function getProductSlugsByBusinessUse(client: AdminBusinessUseClient) {
  const productSlugsByBusinessUse = new Map<string, string[]>();
  const { data, error } = await client.from("product_business_uses").select("product_slug,business_use_slug,sort_order").order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) {
    return productSlugsByBusinessUse;
  }

  for (const row of data) {
    const record = row && typeof row === "object" ? row as Record<string, unknown> : {};
    const productSlug = readString(record.product_slug);
    const businessUseSlug = readString(record.business_use_slug);
    if (!productSlug || !businessUseSlug) {
      continue;
    }

    const current = productSlugsByBusinessUse.get(businessUseSlug) ?? [];
    current.push(productSlug);
    productSlugsByBusinessUse.set(businessUseSlug, current);
  }

  return productSlugsByBusinessUse;
}

function normalizeBusinessUse(row: unknown): BusinessUse | null {
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
