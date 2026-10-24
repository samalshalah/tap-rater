import {customerLocationConnection,customerLocationFlowCookie} from '@/lib/google-business/customer-location-connection';
import {liveDb} from '@/lib/google-business/live-reviews';
import {z} from 'zod';
import {hasCustomerMarketingAccess} from '@/lib/customer-marketing-access';
import {cookies} from "next/headers";
import {googleCustomerIdentity,customerFlowCookie} from "@/lib/google-business/customer-connection";
import { NextResponse } from "next/server";
import { completeGoogleConnection, googleConfig, GoogleTokenExchangeError, type GoogleConnectionStage } from "@/lib/google-business/connection";
import { googleAdminIdentity } from "@/lib/google-business/http";

export async function GET(request: Request) {
  const flow=(await cookies()).get(customerFlowCookie)?.value;
  const customerFlow=Boolean(flow);
  const flowLocation=(await cookies()).get(customerLocationFlowCookie)?.value;
  let businessId:string|null=null;
  const identity = customerFlow ? await googleCustomerIdentity() : await googleAdminIdentity();
  let origin: string;
  try { origin = new URL(googleConfig().redirectUri).origin; }
  catch { return NextResponse.json({ error: "Google connection configuration is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  // Never transfer a callback to another browser/session or retain its code in a login URL.
  if (!identity) return NextResponse.redirect(`${origin}/google-connection-recovery`, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  let outcome = "failed";
  let stage: GoogleConnectionStage = "validate";
  let reason = "";
  try {
    if(customerFlow && (!('email' in identity) || !await hasCustomerMarketingAccess(String(identity.email)))){
      (await cookies()).delete(customerFlowCookie);
      (await cookies()).delete(customerLocationFlowCookie);
      return NextResponse.redirect(`${origin}/account/packages`,{status:303,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    }
    const query = new URL(request.url).searchParams;
    if(customerFlow && query.get("state")!==flow)throw new Error("Invalid customer flow.");
    let owner=identity.owner;
    if(customerFlow&&flowLocation){
      businessId=z.string().uuid().parse(flowLocation);
      const scope=await customerLocationConnection({owner:identity.owner,email:String('email' in identity?identity.email:'')},businessId);
      owner=scope.owner;
    }
    if (query.has("error")) outcome = "cancelled";
    else { await completeGoogleConnection(owner, identity.session, query.get("state") || "", query.get("code") || "", value => { stage = value; }); outcome = "connected";
      // Refresh a legacy link only when Google confirms the same identity. Other locations stay untouched.
      if(customerFlow&&businessId)await liveDb()`UPDATE google_review_links l SET owner=${owner}
       FROM google_business_connections g,businesses b,customers c WHERE g.owner=${owner} AND g.google_subject=l.google_subject
       AND l.business_id=${businessId}::uuid AND b.id=l.business_id AND b.customer_id=l.customer_id AND c.id=b.customer_id
       AND lower(c.email)=${String('email' in identity?identity.email:'')}`;
    }
  } catch (error) {
    outcome="failed";
    // Only an enumerated provider error code is returned, never descriptions, codes or tokens.
    if (error instanceof GoogleTokenExchangeError) reason = error.reason;
  }
  if(customerFlow){(await cookies()).delete(customerFlowCookie);(await cookies()).delete(customerLocationFlowCookie);}
  return NextResponse.redirect(`${origin}${customerFlow?(businessId?"/account/reviews":"/account"):"/admin/google-reviews"}?connection=${outcome}${businessId?`&location=${businessId}`:""}${outcome === "failed" ? `&step=${stage}${reason ? `&reason=${reason}` : ""}` : ""}`, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
