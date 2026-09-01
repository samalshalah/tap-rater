import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { buildSnapshotFromDraft, getHostedPageEditorContext, HostedPageEditorError, renderHostedPageDraftPreview, validateHostedPageEditorDraft } from "@/lib/hosted-page-editor";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;

  try {
    const context = await getHostedPageEditorContext(auth.session.email);
    const body = await request.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code : undefined;
    const selectedContext = code ? await getHostedPageEditorContext(auth.session.email, code) : context;
    if (!selectedContext.configured || !selectedContext.page) {
      return NextResponse.json({ error: "Hosted page was not found for this account." }, { status: 404 });
    }

    const draft = validateHostedPageEditorDraft(body?.draft ?? body);
    const page = { ...selectedContext.page, draft };
    const publicBaseUrl = new URL(request.url).origin;
    const snapshot = buildSnapshotFromDraft(page, new Date(), { requireButtons: false, publicBaseUrl });
    return NextResponse.json({ ok: true, html: renderHostedPageDraftPreview(page, { publicBaseUrl }), snapshot });
  } catch (error) {
    if (error instanceof HostedPageEditorError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Preview could not be generated." }, { status: 500 });
  }
}
