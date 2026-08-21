import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import {
  emailTemplateSettingsSchema,
  getAllEmailTemplates,
  saveEmailTemplate
} from "@/lib/email-templates";

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const templates = await getAllEmailTemplates();
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const parsed = emailTemplateSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Email template settings are invalid." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Database persistence is not configured yet." }, { status: 503 });
  }

  try {
    const template = await saveEmailTemplate(getSupabaseAdmin(), parsed.data);
    return NextResponse.json({ ok: true, template });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email template settings could not be saved." },
      { status: 500 }
    );
  }
}
