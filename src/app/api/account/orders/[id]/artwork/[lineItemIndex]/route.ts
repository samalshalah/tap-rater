import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { getProductMediaObject } from "@/lib/admin-media-storage";
import { getCustomerOrderById, getOrderArtworkStorageKey } from "@/lib/orders";
import { buildCurrentApprovalSnapshot } from "@/lib/production-artwork";
import { isProofApprovalSnapshotCurrent } from "@/lib/direct-production";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; lineItemIndex: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const { response, session } = await requireCustomerApi();
  if (response) {
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  }
  const { id, lineItemIndex } = await context.params;
  const index = Number(lineItemIndex);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    !/^(0|[1-9][0-9]*)$/.test(lineItemIndex) || !Number.isSafeInteger(index)) {
    return NextResponse.json({ error: "Artwork identifier is invalid." }, { status: 400, headers });
  }
  try {
    const { configured, order } = await getCustomerOrderById(id, session.email);
    if (!configured) return NextResponse.json({ error: "Order storage is unavailable." }, { status: 503, headers });
    if (!order || order.email?.trim().toLowerCase() !== session.email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Order was not found." }, { status: 404, headers });
    }
    if (order.status !== "paid" || order.payment_status !== "paid" || order.stripe_refund_id || order.refund_status) {
      return NextResponse.json({ error: "Preview requires confirmed, unreversed payment." }, { status: 409, headers });
    }
    const item = order.line_items_json[index];
    if (!item) return NextResponse.json({ error: "Order preview was not found." }, { status: 404, headers });
    if (item.optionId !== "branded_qr_direct" || item.proofApproved !== true ||
      !isProofApprovalSnapshotCurrent(buildCurrentApprovalSnapshot(item), item.setup?.proofApprovalSnapshot)) {
      return NextResponse.json({ error: "Order preview is not approved." }, { status: 409, headers });
    }
    const key = getOrderArtworkStorageKey(order, index);
    if (!key) return NextResponse.json({ error: "Order preview was not found." }, { status: 404, headers });
    const object = await getProductMediaObject(key);
    const body = object?.body ?? await object?.arrayBuffer?.();
    if (!body) return NextResponse.json({ error: "Order preview was not found." }, { status: 404, headers });
    return new Response(body, { headers: {
      ...headers,
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `inline; filename="order-${id}-line-${index + 1}.svg"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"
    } });
  } catch {
    return NextResponse.json({ error: "Order preview could not be loaded." }, { status: 503, headers });
  }
}
