import { NextResponse } from "next/server";
import { completeGoogleConnection, googleConfig } from "@/lib/google-business/connection";
import { googleAdminIdentity } from "@/lib/google-business/http";

export async function GET(request: Request) {
  const identity = await googleAdminIdentity();
  if (!identity) return NextResponse.json({ error: "Admin login required. Start the Google connection again after signing in." }, { status: 401, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  let origin: string;
  try { origin = new URL(googleConfig().redirectUri).origin; }
  catch { return NextResponse.json({ error: "Google connection configuration is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  let outcome = "failed";
  try {
    const query = new URL(request.url).searchParams;
    if (query.has("error")) outcome = "cancelled";
    else { await completeGoogleConnection(identity.owner, identity.session, query.get("state") || "", query.get("code") || ""); outcome = "connected"; }
  } catch { /* Never log OAuth codes, token responses or raw exception messages. */ }
  return NextResponse.redirect(`${origin}/admin/google-reviews?connection=${outcome}`, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
