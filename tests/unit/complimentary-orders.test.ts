import { beforeEach, describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { buildComplimentaryOrder, complimentaryOrderSchema } from "@/lib/complimentary-orders";
import { canAdvanceOrderFulfillment, isOrderPaymentConfirmed } from "@/lib/order-fulfillment-rules";
import { applyAdminOrderProductionActionWithClient, getOrderProductionBlockers } from "@/lib/orders";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), db: vi.fn(), products: vi.fn(), media: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.auth }));
vi.mock("@/lib/db", () => ({ getSupabaseAdmin: mocks.db, hasSupabaseAdminConfig: () => true }));
vi.mock("@/lib/product-repository", () => ({ getStorefrontProducts: mocks.products }));
vi.mock("@/lib/admin-media-storage", () => ({ isSafeProductMediaKey: (key: string) => key.startsWith("products/") && !key.includes(".."), getProductMediaObject: mocks.media }));
import { POST } from "@/app/api/admin/orders/complimentary/route";

const input = { requestId: "11111111-1111-4111-8111-111111111111", customer: { name: "Test Client", email: "client@example.com" }, productId: "google-review-stand", optionId: "standard_direct", quantity: 2, businessName: "Test Business", destinationUrl: "https://example.com/review", reason: "Client gift", delivery: "pickup" };
const request = (body: unknown = input, origin = "https://taprater.com") => new Request("https://taprater.com/api/admin/orders/complimentary", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body) });

describe("complimentary orders", () => {
  let db: PaymentMemoryDb;
  beforeEach(() => { db = new PaymentMemoryDb(); mocks.auth.mockResolvedValue(null); mocks.db.mockReturnValue(db); mocks.products.mockResolvedValue(migratedProducts); mocks.media.mockResolvedValue({}); });
  it("creates a zero-charge catalog order and retries without duplication", async () => {
    const first = await POST(request({ ...input, total_cents: 9999, title: "Injected product" }));
    expect(first.status).toBe(201);
    const second = await POST(request());
    expect(await second.json()).toEqual(await first.json());
    expect(db.table("orders")).toHaveLength(1);
    const order = db.table("orders")[0];
    expect(order).toMatchObject({ total_cents: 0, shipping_amount_cents: 0, payment_status: "complimentary", shipping_method: "Pickup" });
    expect(order.line_items_json[0]).toMatchObject({ title: "Google Review Stand", unitAmountCents: 0, quantity: 2 });
  });
  it("requires admin and a same-origin request", async () => {
    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await POST(request())).status).toBe(401);
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request(input, "https://other.example"))).status).toBe(403);
    expect(db.table("orders")).toHaveLength(0);
  });
  it("rejects invented, inactive, out-of-stock, and hosted products", async () => {
    expect((await POST(request({ ...input, productId: "invented-stand" }))).status).toBe(400);
    expect((await POST(request({ ...input, optionId: "hosted_multilink" }))).status).toBe(400);
    for (const patch of [{ isActive: false }, { stockStatus: "outofstock" }, { format: "plate" }]) {
      mocks.products.mockResolvedValue(migratedProducts.map(p => p.slug === input.productId ? { ...p, ...patch } : p));
      expect((await POST(request())).status).toBe(400);
    }
  });
  it("requires shipping address and a stored logo for branded orders", async () => {
    expect((await POST(request({ ...input, delivery: "free_shipping" }))).status).toBe(400);
    expect((await POST(request({ ...input, quantity: 0 }))).status).toBe(400);
    expect((await POST(request({ ...input, optionId: "branded_qr_direct" }))).status).toBe(400);
    mocks.media.mockResolvedValue(null);
    expect((await POST(request({ ...input, optionId: "branded_qr_direct", logoStorageKey: "products/test/logo.png" }))).status).toBe(400);
  });
  it("generates production artwork only after an explicit admin approval", async () => {
    const order = buildComplimentaryOrder(complimentaryOrderSchema.parse({ ...input, optionId: "branded_qr_direct", logoStorageKey: "products/test/logo.png" }), migratedProducts);
    order.id = "test-order";
    db.table("orders").push(order);
    expect(getOrderProductionBlockers(order).length).toBeGreaterThan(0);
    const put = vi.fn();
    const result = await applyAdminOrderProductionActionWithClient(db, order.id, { action: "approve_proof_manually" }, {
      storage: { put },
      assetResolver: async () => ({ contentType: "image/png", contentHash: "test-hash", dataUri: "data:image/png;base64,iVBORw0KGgo=", dimensions: { width: 1278, height: 1949 } })
    });
    expect(result).toMatchObject({ ok: true, order: { payment_status: "complimentary", production_status: "ready_for_production" } });
    expect(put).toHaveBeenCalledOnce();
  });
  it("keeps branded proof unapproved and separate from paid sales while allowing production", () => {
    const order = buildComplimentaryOrder(complimentaryOrderSchema.parse({ ...input, optionId: "branded_qr_direct", logoStorageKey: "products/test/logo.png" }), migratedProducts);
    expect(order.line_items_json[0]).toMatchObject({ proofRequired: true, proofApproved: false, setup: { logoMediaUrl: "/api/media/product/products/test/logo.png", qrTargetUrl: input.destinationUrl } });
    expect(canAdvanceOrderFulfillment(order)).toBe(true);
    expect(isOrderPaymentConfirmed(order.status, order.payment_status)).toBe(false);
    expect(canAdvanceOrderFulfillment({ ...order, status: "canceled" })).toBe(false);
  });
});
