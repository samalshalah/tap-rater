import {denyAdminClientContent} from '@/lib/admin-client-privacy';
import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { googleAdminIdentity } from "@/lib/google-business/http";
import { reviewDraftSchema, saveSampleReply, type ReviewActor } from "@/lib/review-workspaces";

export async function handleSampleReply(request: Request, kind: "customer" | "admin") {
 if(isStaffContentRequest(kind))return denyAdminClientContent();
  let actor: ReviewActor;
  if (kind === "admin") {
    if (!(await googleAdminIdentity())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    actor = { kind: "admin" };
  } else {
    const auth = await requireCustomerApi();
    if (auth.response) return auth.response;
    actor = { kind: "customer", email: auth.session.email };
  }
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com").origin;
  if (request.headers.get("origin") !== origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 20000) return NextResponse.json({ error: "Reply is too long." }, { status: 413 });
  const raw = await request.text();
  if (raw.length > 20000) return NextResponse.json({ error: "Reply is too long." }, { status: 413 });
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid reply." }, { status: 400 }); }
  const parsed = reviewDraftSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Use a reply of up to 4,000 characters. Ready replies cannot be empty." }, { status: 400 });
  try {
    const saved = await saveSampleReply(actor, parsed.data);
    if (!saved) return NextResponse.json({ error: "This review is unavailable or changed in another tab. Reload before editing." }, { status: 409 });
    return NextResponse.json({ review: saved }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not save your reply. Please try again." }, { status: 503 });
  }
}

function isStaffContentRequest(kind:string):boolean{return kind==='admin';}
