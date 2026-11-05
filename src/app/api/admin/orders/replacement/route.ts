import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getAdminOrderById } from "@/lib/orders";
import { ensureOrderCustomerRecord } from "@/lib/order-customers";
import { buildDamagedStandReplacement } from "@/lib/replacement-orders";

const replacementSchema = z.object({ requestId: z.string().uuid(), originalOrderId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Order storage is unavailable." }, { status: 503 });
  const parsed = replacementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose the original customer order." }, { status: 400 });

  const { configured, order: source } = await getAdminOrderById(parsed.data.originalOrderId);
  if (!configured || !source) return NextResponse.json({ error: "The original order was not found." }, { status: 404 });
  try {
    const replacement = buildDamagedStandReplacement(source, parsed.data.requestId);
    const db = getSupabaseAdmin();
    const existing = await db.from("orders").select("id").eq("stripe_checkout_session_id", replacement.stripe_checkout_session_id).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.id) return NextResponse.json({ orderId: existing.data.id });
    const saved = await db.from("orders").insert(replacement).select("id").maybeSingle();
    if (saved.error) throw saved.error;
    if (!saved.data?.id) throw new Error("Replacement order save returned no identifier.");
    try { await ensureOrderCustomerRecord(db, replacement); } catch (error) { console.warn("[replacement-orders] customer_directory_sync_failed", { orderId: saved.data.id, reason: error instanceof Error ? error.message : "unknown" }); }
    return NextResponse.json({ orderId: saved.data.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the replacement order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
