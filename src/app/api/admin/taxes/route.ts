import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { saveTaxSettings } from "@/lib/tax-settings";
import { taxSettingsSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const parsed = taxSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Tax settings are invalid." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Database persistence is not configured yet." }, { status: 503 });
  }

  try {
    await saveTaxSettings(getSupabaseAdmin(), parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tax settings could not be saved." }, { status: 500 });
  }
}
