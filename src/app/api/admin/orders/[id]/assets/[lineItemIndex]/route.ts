import { requireAdminApi } from "@/lib/admin-auth";
import { getProductMediaObject } from "@/lib/admin-media-storage";
import { getAdminOrderById } from "@/lib/orders";
import { buildOrderDesignText, getOrderLogoStorageKey } from "@/lib/order-design-assets";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string; lineItemIndex: string }> };
const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (error: string, status: number) => Response.json({ error }, { status, headers: privateHeaders });

export async function GET(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  const { id, lineItemIndex } = await context.params;
  const index = Number(lineItemIndex);
  const url = new URL(request.url);
  const asset = url.searchParams.get("asset");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
      !/^(0|[1-9][0-9]*)$/.test(lineItemIndex) || !Number.isSafeInteger(index) ||
      !["original-logo", "print-logo", "text"].includes(asset ?? "")) return json("Design file identifier is invalid.", 400);
  try {
    const { configured, order } = await getAdminOrderById(id);
    if (!configured) return json("Order storage is unavailable.", 503);
    if (!order) return json("Order was not found.", 404);
    const item = order.line_items_json[index];
    if (!item) return json("Order item was not found.", 404);
    const name = `order-${id}-line-${index + 1}-${asset}`;
    if (asset === "text") {
      return new Response(buildOrderDesignText(order, item, index), { headers: {
        ...privateHeaders, "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.txt"`
      } });
    }
    const key = getOrderLogoStorageKey(item, asset === "original-logo");
    if (!key) return json("No uploaded logo is attached to this order item.", 404);
    const object = await getProductMediaObject(key);
    const body = object?.body ?? await object?.arrayBuffer?.();
    if (!body) return json("The uploaded logo file was not found.", 404);
    const extension = key.split(".").pop()!.toLowerCase();
    const contentType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
    const disposition = url.searchParams.get("preview") === "1" ? "inline" : "attachment";
    return new Response(body, { headers: {
      ...privateHeaders, "Content-Type": contentType, "Content-Disposition": `${disposition}; filename="${name}.${extension}"`
    } });
  } catch {
    return json("The design file could not be loaded. Please try again.", 503);
  }
}
