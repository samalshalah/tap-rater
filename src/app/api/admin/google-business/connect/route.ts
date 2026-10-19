import { NextResponse } from "next/server";
import { beginGoogleConnection } from "@/lib/google-business/connection";
import { googleAdminIdentity, googleSameOrigin } from "@/lib/google-business/http";

export async function POST(request: Request) {
  const identity = await googleAdminIdentity();
  if (!identity) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  try {
    if (!googleSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    return NextResponse.redirect(await beginGoogleConnection(identity.owner, identity.session), { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch { return NextResponse.json({ error: "Google connection is unavailable. Check OAuth configuration and storage." }, { status: 503 }); }
}
