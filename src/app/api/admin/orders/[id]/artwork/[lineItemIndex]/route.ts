import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getProductMediaObject } from "@/lib/admin-media-storage";
import { getAdminOrderById, isOrderArtworkAvailable, getOrderArtworkStorageKey } from "@/lib/orders";
import { buildCurrentApprovalSnapshot } from "@/lib/production-artwork";
import { isProofApprovalSnapshotCurrent } from "@/lib/direct-production";
import { orderStandRegistry } from "@/lib/customer-stand-registry";
import { isValidStandId } from "@/lib/hosted-pages/tracking";
import { replacePrintArtworkQr } from "@/lib/print-artwork-renderer";
import { standTargets } from "@/lib/stand-production";

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
    if (!isOrderArtworkAvailable(order)) {
      return NextResponse.json({ error: "Artwork requires confirmed, unreversed payment." }, { status: 409, headers });
    }
    const item = order.line_items_json[index];
    if (item && (item.optionId !== "branded_qr_direct" || item.proofApproved !== true || !isProofApprovalSnapshotCurrent(buildCurrentApprovalSnapshot(item), item.setup?.proofApprovalSnapshot))) {
      return NextResponse.json({ error: "Artwork is not approved." }, { status: 409, headers });
    }
    const key = getOrderArtworkStorageKey(order, index);
    if (!key) return NextResponse.json({ error: "Order artwork was not found." }, { status: 404, headers });
    const object = await getProductMediaObject(key);
    let body: BodyInit | undefined = object?.body ?? await object?.arrayBuffer?.();
    if (!body) return NextResponse.json({ error: "Order artwork was not found." }, { status: 404, headers });
    const search = new URL(request.url).searchParams;
    const disposition = search.get("preview") === "1" ? "inline" : "attachment";
    // ?stand=ST-… gives that stand its own print file: the same approved design with the stand's own QR.
    const standId = search.get("stand");
    let fileName = `order-${id}-line-${index + 1}.svg`;
    if (standId !== null) {
      const stand = item && isValidStandId(standId)
        ? (await orderStandRegistry(id)).find(row => row.public_id === standId && row.line_id === item.standLineId && Number(row.unit_number) <= item.quantity)
        : undefined;
      if (!item || !stand) return NextResponse.json({ error: "That stand is not part of this order line." }, { status: 404, headers });
      const { qrUrl } = standTargets(item, standId);
      if (!qrUrl) return NextResponse.json({ error: "This stand has no printed QR code." }, { status: 409, headers });
      body = await replacePrintArtworkQr(await new Response(body).text(), qrUrl);
      fileName = `order-${id}-line-${index + 1}-stand-${Number(stand.unit_number)}-${standId}.svg`;
    }
    return new Response(body, { headers: {
      ...headers,
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox allow-downloads"
    } });
  } catch {
    return NextResponse.json({ error: "Order artwork could not be loaded." }, { status: 503, headers });
  }
}
