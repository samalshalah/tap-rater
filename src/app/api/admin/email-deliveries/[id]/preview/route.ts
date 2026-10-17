import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getAdminEmailPreview } from "@/lib/admin-email-preview";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const headers = { "Cache-Control": "private, no-store" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Invalid email ID." }, { status: 400, headers });
  try {
    const preview = await getAdminEmailPreview(id);
    return preview ? NextResponse.json(preview, { headers }) : NextResponse.json({ error: "Email record not found." }, { status: 404, headers });
  } catch {
    return NextResponse.json({ error: "Email preview could not be loaded. Please try again." }, { status: 503, headers });
  }
}
