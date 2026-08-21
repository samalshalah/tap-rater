import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { saveStandTypeContent } from "@/lib/admin-stand-types";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { standTypeContentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const parsed = standTypeContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Stand type content is invalid." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Database persistence is not configured yet. Stand types cannot be saved." }, { status: 503 });
  }

  try {
    await saveStandTypeContent(getSupabaseAdmin(), parsed.data);
    return NextResponse.json({ ok: true, slug: parsed.data.slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Stand type could not be saved." }, { status: 500 });
  }
}
