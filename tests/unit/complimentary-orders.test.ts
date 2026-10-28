import { beforeEach, describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { buildComplimentaryOrder, complimentaryOrderSchema } from "@/lib/complimentary-orders";
import { canAdvanceOrderFulfillment, isOrderPaymentConfirmed } from "@/lib/order-fulfillment-rules";
import { applyAdminOrderProductionActionWithClient, getOrderProductionBlockers } from "@/lib/orders";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), db: vi.fn(), products: vi.fn(), media: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.auth }));
vi.mock("@/lib/db", () => ({ getSupabaseAdmin: mocks.db, hasSupabaseAdminConfig: () => true }));
vi.mock("@/lib/product-repository", () => ({ getCheckoutProducts: mocks.products }));
vi.mock("@/lib/admin-media-storage", () => ({ isSafeProductMediaKey: (key: string) => key.startsWith("products/") && !key.includes(".."), getProductMediaObject: mocks.media }));
import { PATCH } from "@/app/api/admin/orders/[id]/stand/route";
import { POST } from "@/app/api/admin/orders/complimentary/route";

const input = { requestId: "11111111-1111-4111-8111-111111111111", customer: { name: "Test Client", email: "client@example.com" }, productId: "google-review-stand", optionId: "branded_qr_direct", logoStorageKey: "products/test/logo.png", quantity: 2, businessName: "Test Business", destinationUrl: "https://example.com/review", reason: "Client gift", delivery: "pickup" };
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
    expect(order.line_items_json[0]).toMatchObject({ title: "Tap Rater Review Stand for Google Reviews", unitAmountCents: 0, quantity: 2 });
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
    expect((await POST(request({ ...input, design: { logoSizePercent: 999 } }))).status).toBe(400);
    expect((await POST(request({ ...input, optionId: "branded_qr_direct", logoStorageKey: undefined }))).status).toBe(400);
    mocks.media.mockResolvedValue(null);
    expect((await POST(request({ ...input, optionId: "branded_qr_direct", logoStorageKey: "products/test/logo.png" }))).status).toBe(400);
  });
  it("generates production artwork only after an explicit admin approval", async () => {
    const order = buildComplimentaryOrder(complimentaryOrderSchema.parse({ ...input, optionId: "branded_qr_direct", logoStorageKey: "products/test/logo.png", design: { logoSizePercent: 130, fontSizePercent: 90, logoOffsetXPercent: 10, logoOffsetYPercent: -5, logoFitMode: "contain", showBusinessNameOnProof: false } }), migratedProducts);
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
    expect(db.table("orders")[0].line_items_json[0].setup).toMatchObject({ logoSizePercent: 130, fontSizePercent: 90, logoOffsetXPercent: 10, logoOffsetYPercent: -5, showBusinessNameOnProof: false });
  });
  it("keeps branded proof unapproved and separate from paid sales while allowing production", () => {
    const order = buildComplimentaryOrder(complimentaryOrderSchema.parse({ ...input, optionId: "branded_qr_direct", logoStorageKey: "products/test/logo.png", design: { logoSizePercent: 130, fontSizePercent: 90, logoOffsetXPercent: 10, logoOffsetYPercent: -5, logoFitMode: "contain", showBusinessNameOnProof: false } }), migratedProducts);
    expect(order.line_items_json[0]).toMatchObject({ proofRequired: true, proofApproved: false, setup: { logoMediaUrl: "/api/media/product/products/test/logo.png", qrTargetUrl: input.destinationUrl } });
    expect(canAdvanceOrderFulfillment(order)).toBe(true);
    expect(isOrderPaymentConfirmed(order.status, order.payment_status)).toBe(false);
    expect(canAdvanceOrderFulfillment({ ...order, status: "canceled" })).toBe(false);
  });
});

describe("change existing complimentary stand", () => {
  let db: PaymentMemoryDb;
  const edit = (body: Record<string, unknown> = {}, origin = "https://taprater.com") => PATCH(new Request("https://taprater.com/api/admin/orders/order-1/stand", { method: "PATCH", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ expectedUpdatedAt: "2026-10-15T12:00:00.000Z", productId: "yelp-review-stand", optionId: "branded_qr_direct", businessName: "Updated business", destinationUrl: "https://example.com/yelp", logoStorageKey: "products/test/logo.png", ...body }) }), { params: Promise.resolve({ id: "order-1" }) });
  beforeEach(() => {
    const order = buildComplimentaryOrder(complimentaryOrderSchema.parse(input), migratedProducts);
    order.id = "order-1"; order.updated_at = "2026-10-15T12:00:00.000Z";
    order.line_items_json[0].proofApproved = true;
    order.line_items_json[0].setup!.productionArtwork = { old: true };
    order.line_items_json[0].setup!.proofApprovalSnapshot = { old: true };
    db = new PaymentMemoryDb({ orders: [order] });
    mocks.auth.mockResolvedValue(null); mocks.db.mockReturnValue(db); mocks.products.mockResolvedValue(migratedProducts); mocks.media.mockResolvedValue({});
  });
  it("replaces catalog stand, clears artwork and keeps customer, quantity and payment", async () => {
    const before = structuredClone(db.table("orders")[0]);
    expect((await edit()).status).toBe(200);
    const after = db.table("orders")[0];
    for (const key of ["id", "stripe_checkout_session_id", "customer_details_json", "shipping_address_json", "email", "total_cents", "payment_status", "shipping_method"]) expect(after[key]).toEqual(before[key]);
    expect(after.line_items_json[0]).toMatchObject({ productId: "yelp-review-stand", quantity: 2, proofApproved: false, setup: { businessName: "Updated business" } });
    expect(after.line_items_json[0].setup.productionArtwork).toBeUndefined();
    expect(after.line_items_json[0].setup.proofApprovalSnapshot).toBeUndefined();
    expect(after.production_status).toBe("not_started");
  });
  it("rejects paid, shipped, started, completed, and multiple-item orders", async () => {
    for (const patch of [{ payment_status: "paid" }, { shipping_status: "shipped" }, { production_status: "in_production" }, { production_status: "completed" }, { line_items_json: [{}, {}] }]) {
      const before = structuredClone(db.table("orders")[0]);
      Object.assign(db.table("orders")[0], patch);
      expect((await edit()).status).toBe(409);
      db.rows.orders = [before];
    }
  });
  it("rejects stale edits including a concurrent production change", async () => {
    expect((await edit({ expectedUpdatedAt: "old" })).status).toBe(409);
    db.beforeQuery = async (_, action) => { if (action === "update") db.table("orders")[0].production_status = "in_production"; };
    expect((await edit()).status).toBe(409);
    expect(db.table("orders")[0].line_items_json[0].productId).toBe("google-review-stand");
  });
  it("requires admin, origin, catalog option and valid logo", async () => {
    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await edit()).status).toBe(401);
    mocks.auth.mockResolvedValue(null);
    expect((await edit({}, "https://other.example")).status).toBe(403);
    expect((await edit({ productId: "invented" })).status).toBe(400);
    expect((await edit({ optionId: "hosted_multilink" })).status).toBe(400);
    mocks.media.mockResolvedValue(null);
    expect((await edit()).status).toBe(400);
  });
});
