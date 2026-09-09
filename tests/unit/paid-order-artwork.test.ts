import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";
import { buildProofApprovalSnapshot } from "@/lib/direct-production";
import { buildCurrentApprovalSnapshot, generateProductionArtworkForOrderLineItem, getProductionArtworkTemplate, type ProductionArtworkInput } from "@/lib/production-artwork";
import {
  applyAdminOrderProductionActionWithClient, createManualPendingOrderForCheckout, createPendingOrderForCheckoutWithClient,
  ensurePaidOrderProductionArtworkWithClient, savePaidOrderFromCheckoutSessionWithClient, updateOrderFulfillmentWithClient, type OrderLineItem, type OrderRecord
} from "@/lib/orders";
import type { CheckoutCartRow } from "@/lib/checkout";
import { orderFulfillmentUpdateSchema } from "@/lib/validators";

const dbMock = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/db", () => ({ hasSupabaseAdminConfig: () => true, getSupabaseAdmin: dbMock.client }));
vi.mock("@/lib/production-artwork", async (original) => ({
  ...await original<typeof import("@/lib/production-artwork")>(), generateProductionArtworkForOrderLineItem: vi.fn()
}));
const generate = vi.mocked(generateProductionArtworkForOrderLineItem);
const artifactExists = vi.fn(async () => true);
const options = { artworkExists: artifactExists };

function branded(): OrderLineItem {
  const item: OrderLineItem = {
    productId: "google-review-stand", optionId: "branded_qr_direct", title: "Google Review Stand", sku: "GRS-BR",
    quantity: 1, unitAmountCents: 4900, lineSubtotalCents: 4900, proofApproved: true, logoReference: "products/customer/logo.png",
    setup: {
      productSlug: "google-review-stand", optionCode: "branded_qr_direct", destinationUrl: "https://example.com/review",
      generatedQrValue: "https://example.com/review", qrTargetUrl: "https://example.com/review", nfcTargetUrl: "https://example.com/review",
      businessName: "Test Business", logoStorageKey: "products/customer/logo.png", logoMediaUrl: "/api/media/product/products/customer/logo.png",
      frontTemplateUrl: "/api/media/product/products/google/template.png"
    }
  };
  item.setup!.proofApprovalSnapshot = buildProofApprovalSnapshot(buildCurrentApprovalSnapshot(item));
  return item;
}

function paid(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111", stripe_checkout_session_id: "cs_paid", stripe_payment_intent_id: "pi_paid",
    status: "paid", payment_status: "paid", subtotal_cents: 4900, total_cents: 4900, currency: "usd", shipping_amount_cents: 0,
    production_status: "not_started", shipping_status: "not_shipped", shipped_at: null, internal_notes: "", admin_fulfillment_notes: "",
    updated_at: "2026-09-09T00:00:00.000Z", line_items_json: [branded()], ...overrides
  };
}

function generated(input: ProductionArtworkInput): OrderLineItem {
  const sort = (value: any): any => Array.isArray(value) ? value.map(sort) : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sort(v)])) : value;
  const hash = createHash("sha256").update(JSON.stringify(sort(input.item.setup?.proofApprovalSnapshot))).digest("hex");
  const template = getProductionArtworkTemplate(input.item)!;
  return { ...input.item, productionStatus: "ready_for_direct_fulfillment", manualProductionRequired: false, productionWarningCodes: [], setup: {
    ...input.item.setup, productionArtwork: {
      status: "generated", storageKey: `products/google-review-stand/production_artwork/cs-paid/line-${input.lineItemIndex + 1}-${hash.slice(0, 16)}.svg`,
      format: "svg", contentType: "image/svg+xml", widthPx: template.widthPx, heightPx: template.heightPx,
      widthIn: template.widthIn, heightIn: template.heightIn, dpi: template.dpi, templateId: template.id, templateVersion: template.version,
      approvalSnapshotHash: hash, baseTemplateContentHash: "base-hash", logoContentHash: "logo-hash", generatedAt: "2026-09-09T00:00:00.000Z"
    }
  } };
}

function pendingInput() {
  const item = branded();
  return { stripeCheckoutSessionId: "cs_paid", rows: [{ ...item, optionId: "branded_qr_direct", optionLabel: "Branded", destinationMode: "DIRECT",
    customizationLevel: "BRANDED", shortDescription: "", logoRequired: true, logoStatus: "uploaded", proofRequired: true,
    proofApproved: true, productionStatus: "pending_branded_proof_review", manualProductionRequired: true, productionWarningCodes: [] } as CheckoutCartRow],
    subtotalCents: 4900, totalCents: 4900, currency: "usd", customer: { name: "Buyer", email: "buyer@example.com", phone: "", createAccount: false },
    shippingAddress: { name: "Buyer", phone: "", line1: "1 Test St", line2: "", city: "New York", state: "NY", postalCode: "10001", country: "US" }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  generate.mockImplementation(async (input) => generated(input));
  artifactExists.mockResolvedValue(true);
});

describe("paid-only order artwork", () => {
  it.each(["unpaid", "manual_unpaid", null])("rejects an unverified payment status even on a paid order: %s", async payment_status => {
    const client = new PaymentMemoryDb({ orders: [paid({ payment_status })] });
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: false });
    expect(await applyAdminOrderProductionActionWithClient(client, paid().id!, { action: "regenerate_artwork" })).toMatchObject({ ok: false, status: 409 });
    expect(generate).not.toHaveBeenCalled();
  });

  it("uses IS NULL for nullable compare-and-set filters on a PostgREST client", async () => {
    const client = new PaymentMemoryDb({ orders: [paid({ status: "pending_payment", payment_status: "unpaid" })] });
    const from = client.from.bind(client);
    const isNull = vi.fn();
    client.from = (table: string) => {
      const query = from(table);
      const eq = query.eq.bind(query);
      Object.assign(query, { is: (field: string, value: null) => { isNull(field, value); return eq(field, value); } });
      query.eq = (field, value) => { if (value == null) throw new Error("eq(null) never matches in PostgREST"); return eq(field, value); };
      return query;
    };
    expect(await savePaidOrderFromCheckoutSessionWithClient(client, { id: "cs_paid", payment_status: "paid" })).toMatchObject({ ok: true });
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
    expect(isNull).toHaveBeenCalledWith("stripe_refund_id", null);
    expect(isNull).toHaveBeenCalledWith("shipped_at", null);
  });

  it("never generates during pending or manual-unpaid creation, even for approved artwork", async () => {
    const client = new PaymentMemoryDb();
    dbMock.client.mockReturnValue(client);
    const input = pendingInput();
    Object.assign(input.rows[0].setup!, { productionArtwork: { status: "generated", url: "https://public.example/fake.svg" } });
    expect(await createPendingOrderForCheckoutWithClient(client, input)).toMatchObject({ ok: true });
    expect(await createManualPendingOrderForCheckout({ rows: input.rows, subtotalCents: 4900, totalCents: 4900, currency: "usd",
      customerEmail: "buyer@example.com", orderReference: "manual_test" })).toMatchObject({ ok: true });
    expect(generate).not.toHaveBeenCalled();
    expect(client.table("orders").map(row => row.payment_status)).toEqual(["unpaid", "manual_unpaid"]);
    expect(client.table("orders").every(row => row.line_items_json[0].setup.productionArtwork === undefined)).toBe(true);
  });

  it.each([
    { status: "paid", payment_status: "paid" },
    { status: "canceled", payment_status: "refunded", stripe_refund_id: "re_test", refund_status: "succeeded" },
    { status: "failed", payment_status: "failed" }
  ] as const)("preserves existing payment state on stale pending/manual retries: %j", async (state) => {
    const original = paid(state);
    const client = new PaymentMemoryDb({ orders: [structuredClone(original)] });
    dbMock.client.mockReturnValue(client);
    expect(await createPendingOrderForCheckoutWithClient(client, pendingInput())).toMatchObject({ ok: true });
    const result = await createManualPendingOrderForCheckout({ rows: pendingInput().rows, subtotalCents: 1, totalCents: 1,
      currency: "usd", customerEmail: "old@example.com", orderReference: original.stripe_checkout_session_id });
    expect(result).toMatchObject({ ok: true, order: state });
    expect(client.table("orders")[0]).toEqual(original);
    expect(generate).not.toHaveBeenCalled();
  });

  it("does not overwrite an order inserted by a concurrent paid request", async () => {
    const client = new PaymentMemoryDb();
    client.beforeQuery = async (table, action) => {
      if (table === "orders" && action === "insert") { client.beforeQuery = undefined; client.table("orders").push(paid()); }
    };
    expect(await createPendingOrderForCheckoutWithClient(client, pendingInput())).toMatchObject({ ok: true });
    expect(client.table("orders")[0]).toMatchObject({ status: "paid", payment_status: "paid" });
  });

  it("generates only after payment confirmation and attaches to the stored order", async () => {
    const order = paid({ status: "pending_payment", payment_status: "unpaid" });
    const client = new PaymentMemoryDb({ orders: [order] });
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: false });
    expect(generate).not.toHaveBeenCalled();
    expect(await savePaidOrderFromCheckoutSessionWithClient(client, { id: "cs_paid", payment_status: "paid", payment_intent: "pi_paid" })).toMatchObject({ ok: true });
    expect(generate).not.toHaveBeenCalled();
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
    expect(generate).toHaveBeenCalledOnce();
    const ref = client.table("orders")[0].line_items_json[0].setup.productionArtwork;
    expect(ref).toMatchObject({ status: "generated", storageKey: expect.stringContaining("/production_artwork/cs-paid/") });
    expect(ref.url).toMatch(/^\/api\/admin\/orders\//);
    expect(client.table("orders")[0].production_status).toBe("ready_for_production");
  });

  it("clears the prepayment missing-artwork blocker without clearing an explicit shipping hold", async () => {
    for (const shipping_status of ["not_shipped", "blocked"] as const) {
      const client = new PaymentMemoryDb({ orders: [paid({ production_status: "blocked", shipping_status })] });
      expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
      expect(client.table("orders")[0].production_status).toBe(shipping_status === "blocked" ? "blocked" : "ready_for_production");
    }
  });

  it("does not generate while the persisted order is still pending", async () => {
    const client = new PaymentMemoryDb({ orders: [paid({ status: "pending_payment" })] });
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: false });
    expect(generate).not.toHaveBeenCalled();
  });

  it("reuses an existing valid reference and does not rewrite it on retry", async () => {
    const client = new PaymentMemoryDb({ orders: [paid()] });
    await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options);
    const original = structuredClone(client.table("orders")[0]);
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
    expect(generate).toHaveBeenCalledOnce();
    expect(artifactExists).toHaveBeenCalledOnce();
    expect(client.table("orders")[0]).toEqual(original);
  });

  it("removes a stale reference before asking the generator to repair a missing R2 object", async () => {
    const client = new PaymentMemoryDb({ orders: [paid()] });
    await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options);
    artifactExists.mockResolvedValue(false);
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].item.setup).not.toHaveProperty("productionArtwork");
  });

  it("regenerates a reference whose storage key points at another proof for the same line", async () => {
    const client = new PaymentMemoryDb({ orders: [paid()] });
    await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options);
    client.table("orders")[0].line_items_json[0].setup.productionArtwork.storageKey = "products/google-review-stand/production_artwork/cs-paid/line-1-0000000000000000.svg";
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("persists earlier successful lines and retries only failed artwork", async () => {
    const client = new PaymentMemoryDb({ orders: [paid({ line_items_json: [branded(), branded()] })] });
    generate.mockImplementationOnce(async input => generated(input)).mockImplementationOnce(async input => {
      const item = generated(input);
      return { ...item, productionStatus: "artwork_generation_failed", setup: { ...item.setup,
        productionArtwork: { ...(item.setup!.productionArtwork as object), status: "generation_failed", storageKey: undefined, error: "R2 unavailable" } } };
    });
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: false, error: "R2 unavailable" });
    expect(client.table("orders")[0]).toMatchObject({ status: "paid", production_status: "blocked" });
    expect(client.table("orders")[0].line_items_json[0].setup.productionArtwork.status).toBe("generated");
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
    expect(generate).toHaveBeenCalledTimes(3);
    expect(client.table("orders")[0].production_status).toBe("ready_for_production");
  });

  it("keeps an attachment-write failure retryable after payment is already saved", async () => {
    const client = new PaymentMemoryDb({ orders: [paid()] });
    client.failures.push({ table: "orders", action: "update", message: "DB unavailable" });
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: false });
    expect(client.table("orders")[0].payment_status).toBe("paid");
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
  });

  it.each([
    { status: "canceled", payment_status: "refunded", stripe_refund_id: "re_test" },
    { shipping_status: "shipped", shipped_at: "2026-09-09T01:00:00Z" }
  ] as const)("does not generate for refunded or shipped orders: %j", async (state) => {
    const order = paid(state);
    const client = new PaymentMemoryDb({ orders: [structuredClone(order)] });
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
    expect(generate).not.toHaveBeenCalled();
    expect(client.table("orders")[0]).toEqual(order);
  });

  it.each(["refund", "shipment", "edit"])("refuses stale attachment after concurrent %s", async change => {
    const client = new PaymentMemoryDb({ orders: [paid()] });
    generate.mockImplementationOnce(async input => {
      Object.assign(client.table("orders")[0], change === "refund" ? { payment_status: "refunded", stripe_refund_id: "re_test" }
        : change === "shipment" ? { shipping_status: "shipped", shipped_at: "2026-09-09T01:00:00Z" } : { updated_at: "2026-09-09T02:00:00Z" });
      return generated(input);
    });
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: false });
    expect(client.table("orders")[0].line_items_json[0].setup).not.toHaveProperty("productionArtwork");
  });

  it("does not attach artwork after losing the payment lease", async () => {
    const client = new PaymentMemoryDb({ orders: [paid()] });
    let lost = false;
    generate.mockImplementationOnce(async input => { lost = true; return generated(input); });
    const assertActive = async () => { if (lost) throw new Error("Lease expired"); };
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", { ...options, assertActive })).toMatchObject({ ok: false, error: "Lease expired" });
    expect(client.table("orders")[0].line_items_json[0].setup).not.toHaveProperty("productionArtwork");
  });

  it("does not approve a changed hosted QR value implicitly", async () => {
    const item = branded();
    item.destinationMode = "HOSTED";
    item.setup = { ...item.setup, hostedPageCode: "CODE123", generatedQrValue: "https://taprater.com/p/CODE123",
      qrTargetUrl: "https://taprater.com/p/CODE123", nfcTargetUrl: "https://taprater.com/p/CODE123" };
    const client = new PaymentMemoryDb({ orders: [paid({ line_items_json: [item] })] });
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: false });
    expect(generate).not.toHaveBeenCalled();
    item.setup.proofApprovalSnapshot = buildProofApprovalSnapshot(buildCurrentApprovalSnapshot(item));
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: true });
    expect(generate.mock.calls[0][0].item.setup?.qrTargetUrl).toBe("https://taprater.com/p/CODE123");
  });

  it("blocks admin generation until hosted provisioning completes", async () => {
    const item = branded(); item.destinationMode = "HOSTED";
    const client = new PaymentMemoryDb({ orders: [paid({ line_items_json: [item] })] });
    expect(await applyAdminOrderProductionActionWithClient(client, paid().id!, { action: "approve_proof_manually" }, options)).toMatchObject({ ok: false, status: 409 });
    expect(generate).not.toHaveBeenCalled();
  });

  it("persists admin artwork failure without reporting completion and retries successfully", async () => {
    const client = new PaymentMemoryDb({ orders: [paid()] });
    generate.mockImplementationOnce(async input => {
      const item = generated(input);
      return { ...item, setup: { ...item.setup, productionArtwork: { ...(item.setup!.productionArtwork as object), status: "generation_failed", error: "Storage unavailable" } } };
    });
    expect(await applyAdminOrderProductionActionWithClient(client, paid().id!, { action: "regenerate_artwork" }, options)).toMatchObject({ ok: false, status: 503 });
    expect(client.table("orders")[0]).toMatchObject({ payment_status: "paid", production_status: "blocked" });
    expect(await applyAdminOrderProductionActionWithClient(client, paid().id!, { action: "regenerate_artwork" }, options)).toMatchObject({ ok: true });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("does not advance fulfillment or send shipping email after a concurrent refund", async () => {
    const item = branded(); item.optionId = "standard_direct";
    const client = new PaymentMemoryDb({ orders: [paid({ line_items_json: [item] })] });
    const sendShippingNotificationEmailFn = vi.fn();
    client.beforeQuery = async (table, action) => {
      if (table === "orders" && action === "update") {
        client.beforeQuery = undefined;
        Object.assign(client.table("orders")[0], { payment_status: "refunded", stripe_refund_id: "re_test" });
      }
    };
    const input = orderFulfillmentUpdateSchema.parse({ productionStatus: "completed", shippingStatus: "shipped", trackingNumber: "TEST123" });
    expect(await updateOrderFulfillmentWithClient(client, paid().id!, input, { sendShippingNotificationEmailFn })).toMatchObject({ ok: false, status: 409 });
    expect(client.table("orders")[0]).toMatchObject({ payment_status: "refunded", shipping_status: "not_shipped" });
    expect(sendShippingNotificationEmailFn).not.toHaveBeenCalled();
  });

  it("invalidates customer approval when admin requests artwork changes", async () => {
    const client = new PaymentMemoryDb({ orders: [paid()] });
    expect(await applyAdminOrderProductionActionWithClient(client, paid().id!, { action: "request_customer_changes" })).toMatchObject({ ok: true });
    expect(client.table("orders")[0].line_items_json[0].proofApproved).toBe(false);
    expect(await ensurePaidOrderProductionArtworkWithClient(client, "cs_paid", options)).toMatchObject({ ok: false });
    expect(generate).not.toHaveBeenCalled();
  });
});
