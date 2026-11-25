import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";
import { getHostedPageInsights, mergeButtonsByLabel, readInsightRange } from "@/lib/hosted-page-insights";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const codePattern = /^[A-HJKMNPQRSTVWXYZ2-9]{12}$/;

// Page activity for one Multi-Link page the signed-in customer owns (?code=), or several of them
// together (?codes=A,B), e.g. all locations of one business.
export async function GET(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const several = url.searchParams.get("codes");
  const codes = several !== null ? [...new Set(several.split(",").map((code) => code.trim()).filter(Boolean))] : [url.searchParams.get("code") ?? ""];
  if (!codes.length || codes.length > 50 || codes.some((code) => !codePattern.test(code))) return NextResponse.json({ error: "Choose a Multi-Link page." }, { status: 400, headers });
  const pages = await Promise.all(codes.map(async (code) => {
    const context = await getHostedPageEditorContext(auth.session.email, code);
    return context.page && context.page.code === code ? context.page : null;
  }));
  if (pages.some((page) => !page)) return NextResponse.json({ error: "Multi-Link page was not found for this account." }, { status: 404, headers });
  try {
    const insights = await getHostedPageInsights(codes, readInsightRange(url.searchParams.get("days")));
    const labels = Object.fromEntries(pages.flatMap((page) => page!.draft.buttons.map((button) => [button.id, button.label])));
    if (codes.length === 1) return NextResponse.json({ insights, labels }, { headers });
    // Together: the same link on every location counts as one, and each page is named for the by-location list.
    const byButton = mergeButtonsByLabel(insights.byButton, labels);
    const mergedLabels = Object.fromEntries(byButton.filter((row) => row.buttonId.startsWith("label:")).map((row) => [row.buttonId, row.buttonId.slice(6)]));
    const pageNames = Object.fromEntries(pages.map((page) => [page!.code, page!.draft.businessName || page!.businessName || page!.code]));
    return NextResponse.json({ insights: { ...insights, byButton }, labels: mergedLabels, pageNames }, { headers });
  } catch (error) {
    console.error("Multi-Link insights failed", error);
    return NextResponse.json({ error: "Insights are unavailable right now. Try again shortly." }, { status: 503, headers });
  }
}
