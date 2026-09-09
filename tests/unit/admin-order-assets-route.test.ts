import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), order: vi.fn(), object: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.auth }));
vi.mock("@/lib/orders", () => ({ getAdminOrderById: mocks.order }));
vi.mock("@/lib/admin-media-storage", async original => ({ ...await original<typeof import("@/lib/admin-media-storage")>(), getProductMediaObject: mocks.object }));
import { GET } from "@/app/api/admin/orders/[id]/assets/[lineItemIndex]/route";

const id = "11111111-1111-4111-8111-111111111111";
const original = "products/customer-setup-google-review-stand/center_asset/original.png";
const prepared = "products/customer-setup-google-review-stand/center_asset/trimmed.webp";
const order = () => ({ id, status: "paid", payment_status: "paid", line_items_json: [{ productId: "google-review-stand", optionId: "branded_qr_direct", title: "Stand", sku: "GR-BR", quantity: 1,
  setup: { businessName: "Client name", originalLogoStorageKey: original, logoStorageKey: prepared } }] });
const request = (asset = "original-logo", index = "0", orderId = id, extra = "") => GET(new Request(`https://taprater.test/api/admin/orders/${orderId}/assets/${index}?asset=${asset}${extra}`), {
  params: Promise.resolve({ id: orderId, lineItemIndex: index })
});

beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue(null); mocks.order.mockResolvedValue({ configured: true, order: order() });
  mocks.object.mockResolvedValue({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
});

describe("authenticated order source files", () => {
  it("requires admin authentication before reading order or media", async () => {
    mocks.auth.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await request()).status).toBe(401); expect(mocks.order).not.toHaveBeenCalled(); expect(mocks.object).not.toHaveBeenCalled();
  });
  it.each([["svg", "0", id], ["original-logo", "-1", id], ["original-logo", "0.5", id], ["text", "0", "bad-id"], ["text", "99999999999999999", id]])("rejects invalid identifiers %s %s %s", async (asset, index, orderId) => {
    expect((await request(asset, index, orderId)).status).toBe(400); expect(mocks.order).not.toHaveBeenCalled();
  });
  it("downloads the stored original with private headers and a useful filename", async () => {
    const response = await request();
    expect(response.status).toBe(200); expect(mocks.object).toHaveBeenCalledExactlyOnceWith(original);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toBe(`attachment; filename="order-${id}-line-1-original-logo.png"`);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(response.headers.get("Vary")).toBe("Cookie");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff"); expect((await response.arrayBuffer()).byteLength).toBe(3);
  });
  it("can separately download the prepared logo or display a private preview", async () => {
    const response = await request("print-logo", "0", id, "&preview=1");
    expect(response.status).toBe(200); expect(mocks.object).toHaveBeenCalledExactlyOnceWith(prepared);
    expect(response.headers.get("Content-Type")).toBe("image/webp"); expect(response.headers.get("Content-Disposition")).toContain("inline;");
  });
  it("exports design text without reading R2 or exposing raw storage paths", async () => {
    const response = await request("text"); const body = await response.text();
    expect(response.status).toBe(200); expect(body).toContain("Business name: Client name"); expect(body).not.toContain("products/");
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8"); expect(response.headers.get("Content-Disposition")).toContain(".txt"); expect(mocks.object).not.toHaveBeenCalled();
  });
  it("does not accept a caller-supplied key or foreign order media reference", async () => {
    await request("original-logo", "0", id, "&key=products/other/private.png"); expect(mocks.object).toHaveBeenCalledExactlyOnceWith(original);
    mocks.object.mockClear(); const changed = order(); changed.line_items_json[0].setup.originalLogoStorageKey = "products/other/private.png";
    mocks.order.mockResolvedValue({ configured: true, order: changed }); expect((await request()).status).toBe(404); expect(mocks.object).not.toHaveBeenCalled();
  });
  it("reports missing orders, lines, uploads, and unavailable storage", async () => {
    expect((await request("text", "1")).status).toBe(404);
    mocks.object.mockResolvedValue(null); expect((await request()).status).toBe(404);
    mocks.order.mockResolvedValue({ configured: true, order: null }); expect((await request()).status).toBe(404);
    mocks.order.mockResolvedValue({ configured: false, order: null }); expect((await request()).status).toBe(503);
  });
  it("lets staff inspect submitted source files before payment without exposing final artwork", async () => {
    mocks.order.mockResolvedValue({ configured: true, order: { ...order(), status: "pending_payment", payment_status: "unpaid" } });
    expect((await request()).status).toBe(200);
    expect((await request("artwork")).status).toBe(400);
  });
});
