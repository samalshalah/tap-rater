import { NextResponse } from "next/server";
import { disconnectGoogle, googleConfig } from "@/lib/google-business/connection";
import { googleAdminIdentity, googleSameOrigin } from "@/lib/google-business/http";

export async function POST(request: Request) {
  const identity = await googleAdminIdentity();
  if (!identity) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  try {
    if (!googleSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    await disconnectGoogle(identity.owner);
    return NextResponse.redirect(new URL("/admin/google-reviews?connection=disconnected", googleConfig().redirectUri), { status: 303, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not disconnect Google. Please try again." }, { status: 503 }); }
}
