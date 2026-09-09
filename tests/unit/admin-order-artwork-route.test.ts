import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderRecord } from "@/lib/orders";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), order: vi.fn(), object: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.auth }));
vi.mock("@/lib/orders", async original => ({ ...await original<typeof import("@/lib/orders")>(), getAdminOrderById: mocks.order }));
vi.mock("@/lib/admin-media-storage", async original => ({ ...await original<typeof import("@/lib/admin-media-storage")>(), getProductMediaObject: mocks.object }));
import { GET } from "@/app/api/admin/orders/[id]/artwork/[lineItemIndex]/route";
import { GET as publicGET } from "@/app/api/media/product/[...key]/route";

const id = "11111111-1111-4111-8111-111111111111";
const key = "products/google-review-stand/production_artwork/cs-paid/line-1-0123456789abcdef.svg";
function order(): OrderRecord {
  return { id, stripe_checkout_session_id: "cs_paid", status: "paid", payment_status: "paid", shipping_status: "not_shipped",
    subtotal_cents: 4900, total_cents: 4900, currency: "usd", shipping_amount_cents: 0, production_status: "ready_for_production",
    internal_notes: "", admin_fulfillment_notes: "", line_items_json: [{
    productId: "google-review-stand", optionId: "branded_qr_direct", title: "Google Review Stand", sku: "GRS-BR",
    quantity: 1, unitAmountCents: 4900, lineSubtotalCents: 4900, proofApproved: true, setup: { proofApprovalSnapshot: { productSlug: "google-review-stand", optionCode: "branded_qr_direct" }, productionArtwork: {
      status: "generated", storageKey: key, url: "https://public-bucket.example/never-use-this.svg", format: "svg", contentType: "image/svg+xml"
    } }
  }] };
}
function request(index = "0", orderId = id, query = "") {
  return GET(new Request(`https://taprater.test/api/admin/orders/${orderId}/artwork/${index}${query}`), {
    params: Promise.resolve({ id: orderId, lineItemIndex: index })
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.order.mockResolvedValue({ configured: true, order: order() });
  mocks.object.mockResolvedValue({ arrayBuffer: async () => new TextEncoder().encode("<svg/>").buffer });
});

describe("authenticated order artwork", () => {
  it("authenticates before looking up the order or storage object", async () => {
    mocks.auth.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await request()).status).toBe(401);
    expect(mocks.order).not.toHaveBeenCalled();
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it.each([["0", "invalid"], ["-1", id], ["0.1", id], ["1e2", id], ["9999999999999999999", id]])("rejects malformed identifiers %s %s", async (index, orderId) => {
    expect((await request(index, orderId)).status).toBe(400);
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it("downloads only the stored order-line key with private headers", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<svg/>");
    expect(mocks.object).toHaveBeenCalledExactlyOnceWith(key);
    expect(response.headers.get("Content-Disposition")).toContain("attachment;");
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Location")).toBeNull();
  });

  it("uses the same authenticated endpoint for an inline admin preview", async () => {
    const response = await request("0", id, "?preview=1");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("inline;");
    expect(mocks.auth).toHaveBeenCalledOnce();
  });

  it.each(["products/google-review-stand/production_artwork/other-order/line-1-0123456789abcdef.svg",
    "products/google-review-stand/production_artwork/cs-paid/line-2-0123456789abcdef.svg",
    "products/other-product/production_artwork/cs-paid/line-1-0123456789abcdef.svg", "products/../private.svg"])("rejects a key outside the requested order line: %s", async storageKey => {
    const value = order();
    (value.line_items_json[0].setup!.productionArtwork as any).storageKey = storageKey;
    mocks.order.mockResolvedValue({ configured: true, order: value });
    expect((await request()).status).toBe(404);
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it.each([{ payment_status: "unpaid", status: "pending_payment" }, { payment_status: "manual_unpaid", status: "paid" }, { payment_status: "refunded", status: "canceled" }, { stripe_refund_id: "re_pending" }])("blocks unconfirmed or reversed payment %j", async state => {
    mocks.order.mockResolvedValue({ configured: true, order: { ...order(), ...state } });
    expect((await request()).status).toBe(409);
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it("permits reading the existing artifact after shipment without generating anything", async () => {
    mocks.order.mockResolvedValue({ configured: true, order: { ...order(), shipping_status: "shipped", shipped_at: "2026-09-09T00:00:00Z" } });
    expect((await request()).status).toBe(200);
  });

  it("does not expose withdrawn approval or missing objects", async () => {
    const value = order(); value.line_items_json[0].proofApproved = false;
    mocks.order.mockResolvedValue({ configured: true, order: value });
    expect((await request()).status).toBe(409);
    mocks.order.mockResolvedValue({ configured: true, order: order() });
    mocks.object.mockResolvedValue(null);
    expect((await request()).status).toBe(404);
    expect((await request("1")).status).toBe(404);
  });
  it("does not download artwork when the approved configuration has changed", async () => {
    const value = order();
    value.line_items_json[0].setup!.businessName = "Changed since approval";
    mocks.order.mockResolvedValue({ configured: true, order: value });
    expect((await request()).status).toBe(409);
    expect(mocks.object).not.toHaveBeenCalled();
  });
});

describe("public product media", () => {
  it.each([key, key.replace("production_artwork", "%70roduction_artwork"), key.replace("production_artwork", "PRODUCTION_ARTWORK")])("blocks production keys without reading R2: %s", async storageKey => {
    const response = await publicGET(new Request("https://taprater.test/api/media/product/unused"), { params: Promise.resolve({ key: storageKey.split("/") }) });
    expect(response.status).toBe(404);
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it("continues serving ordinary catalog media", async () => {
    const response = await publicGET(new Request("https://taprater.test/api/media/product/products/logo.png"), { params: Promise.resolve({ key: ["products", "logo.png"] }) });
    expect(response.status).toBe(200);
    expect(mocks.object).toHaveBeenCalledWith("products/logo.png");
  });
});
