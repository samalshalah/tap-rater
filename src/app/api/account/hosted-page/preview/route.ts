import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { buildSnapshotFromDraft, getHostedPageEditorContext, HostedPageEditorError, renderHostedPageDraftPreview, validateHostedPageEditorDraft } from "@/lib/hosted-page-editor";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;

  try {
    const context = await getHostedPageEditorContext(auth.session.email);
    if (!context.configured || !context.page) {
      return NextResponse.json({ error: "Hosted page was not found for this account." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const draft = validateHostedPageEditorDraft(body?.draft ?? body);
    const page = { ...context.page, draft };
    const snapshot = buildSnapshotFromDraft(page);
    return NextResponse.json({ ok: true, html: renderHostedPageDraftPreview(page), snapshot });
  } catch (error) {
    if (error instanceof HostedPageEditorError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Preview could not be generated." }, { status: 500 });
  }
}

