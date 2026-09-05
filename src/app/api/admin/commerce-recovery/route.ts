import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { retryCommerceRecovery } from "@/lib/commerce-recovery";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !/^(test|live):(checkout:cs_[a-zA-Z0-9_]+|invoice:in_[a-zA-Z0-9_]+)$/.test(body.id)) {
    return NextResponse.json({ error: "Recovery identifier is invalid." }, { status: 400 });
  }
  try { return await retryCommerceRecovery(body.id); }
  catch { return NextResponse.json({ error: "Recovery could not complete. The record is retained for retry." }, { status: 503 }); }
}
