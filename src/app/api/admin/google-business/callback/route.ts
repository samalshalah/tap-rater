import {cookies} from "next/headers";
import {googleCustomerIdentity,customerFlowCookie} from "@/lib/google-business/customer-connection";
import { NextResponse } from "next/server";
import { completeGoogleConnection, googleConfig, GoogleTokenExchangeError, type GoogleConnectionStage } from "@/lib/google-business/connection";
import { googleAdminIdentity } from "@/lib/google-business/http";

export async function GET(request: Request) {
  const flow=(await cookies()).get(customerFlowCookie)?.value;
  const customerFlow=Boolean(flow);
  const identity = customerFlow ? await googleCustomerIdentity() : await googleAdminIdentity();
  if (!identity) return NextResponse.json({ error: "Admin login required. Start the Google connection again after signing in." }, { status: 401, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  let origin: string;
  try { origin = new URL(googleConfig().redirectUri).origin; }
  catch { return NextResponse.json({ error: "Google connection configuration is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  let outcome = "failed";
  let stage: GoogleConnectionStage = "validate";
  let reason = "";
  try {
    const query = new URL(request.url).searchParams;
    if(customerFlow && query.get("state")!==flow)throw new Error("Invalid customer flow.");
    if (query.has("error")) outcome = "cancelled";
    else { await completeGoogleConnection(identity.owner, identity.session, query.get("state") || "", query.get("code") || "", value => { stage = value; }); outcome = "connected"; }
  } catch (error) {
    // Only an enumerated provider error code is returned, never descriptions, codes or tokens.
    if (error instanceof GoogleTokenExchangeError) reason = error.reason;
  }
  if(customerFlow)(await cookies()).delete(customerFlowCookie);
  return NextResponse.redirect(`${origin}${customerFlow?"/account/reviews":"/admin/google-reviews"}?connection=${outcome}${outcome === "failed" ? `&step=${stage}${reason ? `&reason=${reason}` : ""}` : ""}`, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
