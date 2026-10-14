import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { businessUseGuideSchema, defaultBusinessUseGuide } from "@/lib/business-use-guide";

export async function getBusinessUseGuide(slug: string) {
  const fallback = defaultBusinessUseGuide(slug);
  if (!hasSupabaseAdminConfig()) return fallback;
  const { data, error } = await getSupabaseAdmin().from("site_content").select("payload")
    .eq("key", `business-guide.${slug}`).maybeSingle();
  if (error) throw new Error("Business buying guide could not be loaded.");
  if (!data) return fallback;
  if (!data.payload || typeof data.payload !== "object" || Array.isArray(data.payload)) throw new Error("Business buying guide content is invalid.");
  const parsed = businessUseGuideSchema.safeParse({ ...fallback, ...data.payload });
  if (!parsed.success) throw new Error("Business buying guide content is invalid.");
  return parsed.data;
}
