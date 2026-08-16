import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { deleteProductContentBySlugs, saveProductContent, type CmsDbClient } from "@/lib/cms-repository";
import { adminProductDeleteSchema, productContentSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const parsed = productContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Product content is invalid." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Database persistence is not configured yet. Product edits cannot be saved." }, { status: 503 });
  }

  try {
    await saveProductContent(getSupabaseAdmin() as CmsDbClient, parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Product content could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const parsed = adminProductDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Product delete request is invalid." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Database persistence is not configured yet. Products cannot be deleted." }, { status: 503 });
  }

  try {
    const deletedSlugs = await deleteProductContentBySlugs(getSupabaseAdmin() as CmsDbClient, parsed.data.slugs);
    return NextResponse.json({ ok: true, deletedSlugs });
  } catch {
    return NextResponse.json({ error: "Products could not be deleted." }, { status: 500 });
  }
}
