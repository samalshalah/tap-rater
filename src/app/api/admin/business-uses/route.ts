import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { saveBusinessUseContent } from "@/lib/admin-business-uses";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { businessUseContentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const parsed = businessUseContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Business use content is invalid." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Database persistence is not configured yet. Business uses cannot be saved." }, { status: 503 });
  }

  try {
    await saveBusinessUseContent(getSupabaseAdmin(), parsed.data);
    return NextResponse.json({ ok: true, slug: parsed.data.slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Business use could not be saved." }, { status: 500 });
  }
}
