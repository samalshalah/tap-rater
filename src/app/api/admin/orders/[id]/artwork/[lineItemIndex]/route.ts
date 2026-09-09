import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getProductMediaObject } from "@/lib/admin-media-storage";
import { getAdminOrderById, getOrderArtworkStorageKey } from "@/lib/orders";
import { buildCurrentApprovalSnapshot } from "@/lib/production-artwork";
import { isProofApprovalSnapshotCurrent } from "@/lib/direct-production";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; lineItemIndex: string }> };

export async function GET(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  const { id, lineItemIndex } = await context.params;
  const index = Number(lineItemIndex);
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    !/^(0|[1-9][0-9]*)$/.test(lineItemIndex) || !Number.isSafeInteger(index)) {
    return NextResponse.json({ error: "Artwork identifier is invalid." }, { status: 400, headers });
  }
  try {
    const { configured, order } = await getAdminOrderById(id);
    if (!configured) return NextResponse.json({ error: "Order storage is unavailable." }, { status: 503, headers });
    if (!order) return NextResponse.json({ error: "Order was not found." }, { status: 404, headers });
    if (order.status !== "paid" || order.payment_status !== "paid" || order.stripe_refund_id || order.refund_status) {
      return NextResponse.json({ error: "Artwork requires confirmed, unreversed payment." }, { status: 409, headers });
    }
    const item = order.line_items_json[index];
    if (item && (item.optionId !== "branded_qr_direct" || item.proofApproved !== true || !isProofApprovalSnapshotCurrent(buildCurrentApprovalSnapshot(item), item.setup?.proofApprovalSnapshot))) {
      return NextResponse.json({ error: "Artwork is not approved." }, { status: 409, headers });
    }
    const key = getOrderArtworkStorageKey(order, index);
    if (!key) return NextResponse.json({ error: "Order artwork was not found." }, { status: 404, headers });
    const object = await getProductMediaObject(key);
    const body = object?.body ?? await object?.arrayBuffer?.();
    if (!body) return NextResponse.json({ error: "Order artwork was not found." }, { status: 404, headers });
    const disposition = new URL(request.url).searchParams.get("preview") === "1" ? "inline" : "attachment";
    return new Response(body, { headers: {
      ...headers,
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `${disposition}; filename="order-${id}-line-${index + 1}.svg"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"
    } });
  } catch {
    return NextResponse.json({ error: "Order artwork could not be loaded." }, { status: 503, headers });
  }
}
