import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { complimentaryOrderSchema, buildComplimentaryOrder } from "@/lib/complimentary-orders";
import { getCheckoutProducts } from "@/lib/product-repository";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getProductMediaObject, isSafeProductMediaKey } from "@/lib/admin-media-storage";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth) return auth;
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Order storage is unavailable." }, { status: 503 });
  const parsed = complimentaryOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order." }, { status: 400 });
  try {
    const input = parsed.data;
    if (input.logoStorageKey && (!isSafeProductMediaKey(input.logoStorageKey) || !await getProductMediaObject(input.logoStorageKey))) return NextResponse.json({ error: "Upload a valid logo before creating the order." }, { status: 400 });
    const order = buildComplimentaryOrder(input, await getCheckoutProducts());
    const db = getSupabaseAdmin();
    const reference = order.stripe_checkout_session_id;
    const existing = await db.from("orders").select("id").eq("stripe_checkout_session_id", reference).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return NextResponse.json({ orderId: existing.data.id });
    const saved = await db.from("orders").insert(order).select("id").maybeSingle();
    if (saved.error) {
      // A concurrent retry can only reuse this order; never overwrite it.
      if (saved.error.code === "23505") {
        const retry = await db.from("orders").select("id").eq("stripe_checkout_session_id", reference).maybeSingle();
        if (retry.data) return NextResponse.json({ orderId: retry.data.id });
      }
      throw saved.error;
    }
    if (!saved.data) throw new Error("Order save returned no identifier.");
    return NextResponse.json({ orderId: saved.data.id }, { status: 201 });
  } catch (error) {
    const invalid = error instanceof Error && error.message.startsWith("Choose an available");
    return NextResponse.json({ error: invalid ? (error as Error).message : "Could not save the order. Retry safely with the same form." }, { status: invalid ? 400 : 500 });
  }
}
