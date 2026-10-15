import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { changeComplimentaryStandSchema, canChangeComplimentaryStand, buildComplimentaryStandChange } from "@/lib/complimentary-orders";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getProductMediaObject, isSafeProductMediaKey } from "@/lib/admin-media-storage";
import type { OrderRecord } from "@/lib/orders";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth) return auth;
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Order storage is unavailable." }, { status: 503 });
  const parsed = changeComplimentaryStandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid stand." }, { status: 400 });
  try {
    const { id } = await params;
    const db = getSupabaseAdmin();
    const found = await db.from("orders").select("*").eq("id", id).maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const order = found.data as OrderRecord;
    const input = parsed.data;
    if (!canChangeComplimentaryStand(order)) return NextResponse.json({ error: "Only complimentary orders awaiting production can change stands." }, { status: 409 });
    if (order.updated_at !== input.expectedUpdatedAt) return NextResponse.json({ error: "This order changed. Reload the page before editing." }, { status: 409 });
    if (input.logoStorageKey && (!isSafeProductMediaKey(input.logoStorageKey) || !await getProductMediaObject(input.logoStorageKey))) return NextResponse.json({ error: "Upload a valid logo." }, { status: 400 });
    const patch = buildComplimentaryStandChange(order, input, await getStorefrontProducts());
    const saved = await db.from("orders").update(patch).eq("id", id).eq("updated_at", input.expectedUpdatedAt)
      .eq("status", "paid").eq("payment_status", "complimentary").eq("production_status", order.production_status)
      .eq("shipping_status", order.shipping_status).select("id").maybeSingle();
    if (saved.error) throw saved.error;
    if (!saved.data) return NextResponse.json({ error: "This order changed. Reload the page before editing." }, { status: 409 });
    return NextResponse.json({ orderId: id });
  } catch (error) {
    const invalid = error instanceof Error && error.message.startsWith("Choose an available");
    return NextResponse.json({ error: invalid ? (error as Error).message : "Could not change the stand." }, { status: invalid ? 400 : 500 });
  }
}
