import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { ensureHostedPagePlaceholder } from "@/lib/hosted-pages/placeholder";
import { createQrSvg } from "@/lib/qr-code";
import { standTargetUrl } from "@/lib/hosted-pages/tracking";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

// QR code for the page's permanent link. Makes sure the link is live first.
export async function POST(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request." }, { status: 403, headers });

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  if (!/^[A-HJKMNPQRSTVWXYZ2-9]{12}$/.test(code)) return NextResponse.json({ error: "Choose a Multi-Link page." }, { status: 400, headers });

  const context = await getHostedPageEditorContext(auth.session.email, code);
  if (!context.page || context.page.code !== code) return NextResponse.json({ error: "Multi-Link page was not found for this account." }, { status: 404, headers });

  const url = `https://taprater.com/p/${code}`;
  try {
    const storage = await getHostedPageStorage();
    if (!storage) return NextResponse.json({ error: "Your page link couldn’t be checked. Try again shortly." }, { status: 503, headers });
    const { page } = context;
    await ensureHostedPagePlaceholder(storage, {
      code,
      physicalProductRef: page.id,
      assignedBy: `customer:${page.customerId}`,
      businessName: page.draft.businessName || page.businessName,
      headline: page.draft.headline,
      logoUrl: /^https?:\/\//.test(page.draft.logoUrl ?? "") ? page.draft.logoUrl : undefined,
      lifecycleStatus: page.lifecycleStatus
    });
    // The QR carries ?s=qr so page insights count it as a scan.
    return NextResponse.json({ url, svg: await createQrSvg(standTargetUrl(url, "qr")) }, { headers });
  } catch (error) {
    console.error("Multi-Link QR failed", error);
    return NextResponse.json({ error: "The QR code couldn’t be created. Try again." }, { status: 500, headers });
  }
}
