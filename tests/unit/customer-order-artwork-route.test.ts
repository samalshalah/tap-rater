import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderRecord } from "@/lib/orders";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), order: vi.fn(), object: vi.fn() }));
vi.mock("@/lib/customer-auth", () => ({ requireCustomerApi: mocks.auth }));
vi.mock("@/lib/orders", async original => ({ ...await original<typeof import("@/lib/orders")>(), getCustomerOrderById: mocks.order }));
vi.mock("@/lib/admin-media-storage", async original => ({ ...await original<typeof import("@/lib/admin-media-storage")>(), getProductMediaObject: mocks.object }));
import { GET } from "@/app/api/account/orders/[id]/artwork/[lineItemIndex]/route";

const id = "11111111-1111-4111-8111-111111111111";
const email = "owner@example.com";
const key = "products/google-review-stand/production_artwork/cs-paid/line-1-0123456789abcdef.svg";
function order(): OrderRecord {
  return { id, email, stripe_checkout_session_id: "cs_paid", status: "paid", payment_status: "paid", shipping_status: "not_shipped",
    subtotal_cents: 4900, total_cents: 4900, currency: "usd", shipping_amount_cents: 0, production_status: "ready_for_production",
    internal_notes: "", admin_fulfillment_notes: "", line_items_json: [{
      productId: "google-review-stand", optionId: "branded_qr_direct", title: "Google Review Stand", sku: "GRS-BR",
      quantity: 1, unitAmountCents: 4900, lineSubtotalCents: 4900, proofApproved: true,
      setup: { proofApprovalSnapshot: { productSlug: "google-review-stand", optionCode: "branded_qr_direct" }, productionArtwork: {
        status: "generated", storageKey: key, url: "/api/admin/orders/never-use-this/artwork/0", format: "svg", contentType: "image/svg+xml"
      } }
    }] };
}
function request(index = "0", orderId = id) {
  return GET(new Request(`https://taprater.test/api/account/orders/${orderId}/artwork/${index}`), {
    params: Promise.resolve({ id: orderId, lineItemIndex: index })
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ response: null, session: { email } });
  mocks.order.mockResolvedValue({ configured: true, order: order() });
  mocks.object.mockResolvedValue({ arrayBuffer: async () => new TextEncoder().encode("<svg/>").buffer });
});

describe("customer order preview", () => {
  it("requires customer authentication before looking up order or object", async () => {
    mocks.auth.mockResolvedValue({ session: null, response: Response.json({ error: "Unauthorized" }, { status: 401 }) });
    const response = await request();
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.order).not.toHaveBeenCalled();
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it("serves the owner's saved artwork inline with private SVG headers", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<svg/>");
    expect(mocks.order).toHaveBeenCalledExactlyOnceWith(id, email);
    expect(mocks.object).toHaveBeenCalledExactlyOnceWith(key);
    expect(response.headers.get("Content-Disposition")).toBe(`inline; filename="order-${id}-line-1.svg"`);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(response.headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Location")).toBeNull();
  });

  it.each([null, { ...order(), email: "another@example.com" }, { ...order(), email: null }])("does not disclose another customer's order", async value => {
    mocks.order.mockResolvedValue({ configured: true, order: value });
    const response = await request();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Order was not found." });
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it.each([["0", "invalid"], ["-1", id], ["0.1", id], ["1e2", id], ["01", id], ["9999999999999999999", id]])("rejects malformed identifiers %s %s", async (index, orderId) => {
    expect((await request(index, orderId)).status).toBe(400);
    expect(mocks.order).not.toHaveBeenCalled();
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it.each([
    "products/google-review-stand/production_artwork/other-order/line-1-0123456789abcdef.svg",
    "products/google-review-stand/production_artwork/cs-paid/line-2-0123456789abcdef.svg",
    "products/other-product/production_artwork/cs-paid/line-1-0123456789abcdef.svg", "products/../private.svg"
  ])("rejects artwork outside this order line: %s", async storageKey => {
    const value = order();
    (value.line_items_json[0].setup!.productionArtwork as any).storageKey = storageKey;
    mocks.order.mockResolvedValue({ configured: true, order: value });
    expect((await request()).status).toBe(404);
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it.each([{ status: "pending_payment", payment_status: "unpaid" }, { payment_status: "manual_unpaid" },
    { payment_status: "refunded" }, { stripe_refund_id: "re_pending" }, { refund_status: "pending" }])("does not release artwork before confirmed unreversed payment: %j", async payment => {
    mocks.order.mockResolvedValue({ configured: true, order: { ...order(), ...payment } });
    expect((await request()).status).toBe(409);
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it.each(["standard", "unapproved", "changed"])("does not serve %s artwork", async state => {
    const value = order();
    if (state === "standard") value.line_items_json[0].optionId = "standard_direct";
    if (state === "unapproved") value.line_items_json[0].proofApproved = false;
    if (state === "changed") value.line_items_json[0].setup!.businessName = "Unapproved change";
    mocks.order.mockResolvedValue({ configured: true, order: value });
    expect((await request()).status).toBe(409);
    expect(mocks.object).not.toHaveBeenCalled();
  });

  it("serves branded Multi-Link artwork after shipment without regenerating it", async () => {
    const value = order();
    value.shipping_status = "shipped";
    value.line_items_json[0].destinationMode = "HOSTED";
    mocks.order.mockResolvedValue({ configured: true, order: value });
    expect((await request()).status).toBe(200);
  });

  it("handles missing line items and files", async () => {
    expect((await request("1")).status).toBe(404);
    expect(mocks.object).not.toHaveBeenCalled();
    mocks.object.mockResolvedValue(null);
    expect((await request()).status).toBe(404);
  });

  it("handles unavailable storage without leaking internal errors", async () => {
    mocks.order.mockResolvedValue({ configured: false, order: null });
    expect((await request()).status).toBe(503);
    mocks.order.mockRejectedValue(new Error("private connection details"));
    const response = await request();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private connection details");
    expect(mocks.object).not.toHaveBeenCalled();
  });
});
