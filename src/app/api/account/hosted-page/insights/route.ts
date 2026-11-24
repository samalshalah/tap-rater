import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";
import { getHostedPageInsights, readInsightRange } from "@/lib/hosted-page-insights";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

// Page activity for a Multi-Link page the signed-in customer owns.
export async function GET(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  if (!/^[A-HJKMNPQRSTVWXYZ2-9]{12}$/.test(code)) return NextResponse.json({ error: "Choose a Multi-Link page." }, { status: 400, headers });
  const context = await getHostedPageEditorContext(auth.session.email, code);
  if (!context.page || context.page.code !== code) return NextResponse.json({ error: "Multi-Link page was not found for this account." }, { status: 404, headers });
  try {
    const insights = await getHostedPageInsights(code, readInsightRange(url.searchParams.get("days")));
    const labels = Object.fromEntries(context.page.draft.buttons.map((button) => [button.id, button.label]));
    return NextResponse.json({ insights, labels }, { headers });
  } catch (error) {
    console.error("Multi-Link insights failed", error);
    return NextResponse.json({ error: "Insights are unavailable right now. Try again shortly." }, { status: 503, headers });
  }
}
