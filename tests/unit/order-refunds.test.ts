import { describe, expect, it, vi } from "vitest";
import { refundAdminOrder, summarizeRefunds, processStripeRefundEvent, saveOrderRefundSummaryWithClient, findOrderCheckoutForPayment, type AdminOrderRefundDependencies } from "@/lib/order-refunds";
import type { OrderRecord } from "@/lib/orders";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";
import { canAdvanceOrderFulfillment } from "@/lib/order-fulfillment-rules";

const paidOrder: OrderRecord = {
  id: "order-1",
  stripe_checkout_session_id: "cs_test_1",
  stripe_payment_intent_id: "pi_test_1",
  status: "paid",
  payment_status: "paid",
  subtotal_cents: 3900,
  total_cents: 5334,
  currency: "usd",
  line_items_json: [],
  shipping_amount_cents: 1200,
  production_status: "not_started",
  shipping_status: "not_shipped",
  internal_notes: "",
  admin_fulfillment_notes: "",
};

function createDependencies(order: OrderRecord | null): AdminOrderRefundDependencies {
  return {
    getOrder: vi.fn().mockResolvedValue({ configured: true, order }),
    createRefund: vi.fn().mockResolvedValue({ id: "re_test_1", amount: 5334, status: "succeeded", created: 100 }),
    listRefunds: vi.fn().mockResolvedValue([]),
    saveRefunds: vi.fn(async (order, refunds) => summarizeRefunds(order, refunds)),
    withLock: async (_key, work) => work(async () => {}),
  };
}

describe("admin order refunds", () => {
  it("creates an idempotent full refund and stores its reference", async () => {
    const dependencies = createDependencies(paidOrder);

    await expect(refundAdminOrder("order-1", dependencies)).resolves.toEqual({
      ok: true,
      refundId: "re_test_1",
      refundStatus: "succeeded",
      alreadyRefunded: false,
    });
    expect(dependencies.createRefund).toHaveBeenCalledWith(
      "pi_test_1",
      "order-1",
      "order-order-1-full-refund",
    );
    expect(dependencies.saveRefunds).toHaveBeenCalledWith(paidOrder, [expect.objectContaining({ id: "re_test_1", status: "succeeded" })]);
  });

  it("does not call Stripe again for an already refunded order", async () => {
    const dependencies = createDependencies({
      ...paidOrder,
      status: "canceled",
      payment_status: "refunded",
      stripe_refund_id: "re_existing",
    });
    vi.mocked(dependencies.listRefunds).mockResolvedValue([{ id: "re_existing", amount: 5334, status: "succeeded", created: 100 }]);

    await expect(refundAdminOrder("order-1", dependencies)).resolves.toEqual({
      ok: true,
      refundId: "re_existing",
      refundStatus: "succeeded",
      alreadyRefunded: true,
    });
    expect(dependencies.createRefund).not.toHaveBeenCalled();
  });

  it("stops when a refunded order has no Stripe refund reference", async () => {
    const dependencies = createDependencies({
      ...paidOrder,
      status: "canceled",
      payment_status: "refunded",
      stripe_refund_id: null
    });

    await expect(refundAdminOrder("order-1", dependencies)).resolves.toEqual({
      ok: false,
      status: 409,
      error: "Recorded refund was not found in Stripe. Review before retrying."
    });
    expect(dependencies.createRefund).not.toHaveBeenCalled();
  });

  it("rejects an unpaid order", async () => {
    const dependencies = createDependencies({
      ...paidOrder,
      status: "pending_payment",
      payment_status: "unpaid",
    });

    await expect(refundAdminOrder("order-1", dependencies)).resolves.toEqual({
      ok: false,
      status: 409,
      error: "Only paid orders can be refunded.",
    });
    expect(dependencies.createRefund).not.toHaveBeenCalled();
  });

  it("rejects paid orders that have no Stripe payment reference", async () => {
    const dependencies = createDependencies({ ...paidOrder, stripe_payment_intent_id: null });

    await expect(refundAdminOrder("order-1", dependencies)).resolves.toEqual({
      ok: false,
      status: 409,
      error: "This order has no Stripe payment reference."
    });
    expect(dependencies.createRefund).not.toHaveBeenCalled();
  });

  it("leaves the order untouched when Stripe rejects the refund", async () => {
    const dependencies = createDependencies(paidOrder);
    vi.mocked(dependencies.createRefund).mockRejectedValue(new Error("Stripe refund failed."));

    await expect(refundAdminOrder("order-1", dependencies)).resolves.toEqual({
      ok: false,
      status: 502,
      error: "Stripe refund failed."
    });
    expect(dependencies.saveRefunds).not.toHaveBeenCalled();
  });

  it("reports when Stripe succeeded but the local order update failed", async () => {
    const dependencies = createDependencies(paidOrder);
    vi.mocked(dependencies.saveRefunds).mockRejectedValue(new Error("database unavailable"));

    await expect(refundAdminOrder("order-1", dependencies)).resolves.toEqual({
      ok: false,
      status: 500,
      error: "Stripe accepted the refund request, but its local status could not be saved. Retry to reconcile; do not create another refund."
    });
  });

  it.each(["pending", "requires_action", "failed", "canceled"])("does not label a %s refund as completed", async (status) => {
    const deps = createDependencies(paidOrder);
    vi.mocked(deps.createRefund).mockResolvedValue({ id: "re_pending", amount: 5334, status, created: 100 });
    expect(await refundAdminOrder("order-1", deps)).toMatchObject({ ok: true, refundStatus: status, alreadyRefunded: false });
  });

  it("reconciles a previous Stripe refund after a local save failure instead of refunding again", async () => {
    const deps = createDependencies(paidOrder);
    const refund = { id: "re_retry", amount: 5334, status: "pending", created: 100 };
    vi.mocked(deps.createRefund).mockResolvedValue(refund);
    vi.mocked(deps.saveRefunds).mockRejectedValueOnce(new Error("DB unavailable"));
    expect(await refundAdminOrder("order-1", deps)).toMatchObject({ ok: false, status: 500 });
    vi.mocked(deps.listRefunds).mockResolvedValue([refund]);
    expect(await refundAdminOrder("order-1", deps)).toMatchObject({ ok: true, refundStatus: "pending" });
    expect(deps.createRefund).toHaveBeenCalledTimes(1);
  });

  it("aggregates partial refunds without counting duplicate IDs or failed amounts", () => {
    const first = { id: "re_a", amount: 2000, status: "succeeded", created: 100 };
    expect(summarizeRefunds(paidOrder, [first, first, { id: "re_b", amount: 3334, status: "failed", created: 200 }])).toMatchObject({
      refundedAmountCents: 2000, paymentStatus: "partially_refunded", refundStatus: "partially_refunded",
    });
  });

  it("synchronizes pending, succeeded and later failed Stripe states without stale-event rollback", async () => {
    const client = new PaymentMemoryDb({ orders: [structuredClone(paidOrder)] });
    const listRefunds = vi.fn().mockResolvedValue([{ id: "re_1", amount: 5334, status: "pending", created: 100 }]);
    const input = { paymentIntentId: "pi_test_1", refundId: "re_1" };
    expect(await processStripeRefundEvent(input, { client, listRefunds })).toMatchObject({ ok: true });
    expect(client.table("orders")[0]).toMatchObject({ payment_status: "refund_pending", refunded_at: null, refund_pending_amount_cents: 5334 });
    expect(canAdvanceOrderFulfillment(client.table("orders")[0] as OrderRecord)).toBe(false);
    listRefunds.mockResolvedValue([{ id: "re_1", amount: 5334, status: "succeeded", created: 100 }]);
    expect(await processStripeRefundEvent(input, { client, listRefunds })).toMatchObject({ ok: true });
    expect(client.table("orders")[0]).toMatchObject({ status: "canceled", payment_status: "refunded", refunded_amount_cents: 5334, refund_pending_amount_cents: 0 });
    expect(await processStripeRefundEvent(input, { client, listRefunds })).toMatchObject({ ok: true });
    expect(client.table("orders")[0].payment_status).toBe("refunded");
    listRefunds.mockResolvedValue([{ id: "re_1", amount: 5334, status: "failed", failure_reason: "declined", created: 100 }]);
    expect(await processStripeRefundEvent(input, { client, listRefunds })).toMatchObject({ ok: true });
    expect(client.table("orders")[0]).toMatchObject({ payment_status: "refund_failed", refunded_at: null, refund_failure_reason: "declined" });
    expect(canAdvanceOrderFulfillment(client.table("orders")[0] as OrderRecord)).toBe(false);
  });

  it("keeps a refund arriving before its order retryable", async () => {
    const client = new PaymentMemoryDb();
    const listRefunds = vi.fn().mockResolvedValue([{ id: "re_early", amount: 5334, status: "succeeded", created: 100 }]);
    const input = { paymentIntentId: "pi_test_1", refundId: "re_early" };
    expect(await processStripeRefundEvent(input, { client, listRefunds })).toMatchObject({ ok: false });
    client.table("orders").push(structuredClone(paidOrder));
    expect(await processStripeRefundEvent(input, { client, listRefunds })).toMatchObject({ ok: true });
  });

  it("repairs a missing payment reference through its own checkout before applying a refund", async () => {
    const order = { ...paidOrder, stripe_payment_intent_id: null };
    const client = new PaymentMemoryDb({ orders: [order] });
    const listRefunds = vi.fn().mockResolvedValue([{ id: "re_linked", amount: 5334, status: "succeeded", created: 100 }]);
    const findCheckoutSession = vi.fn().mockResolvedValue({ id: paidOrder.stripe_checkout_session_id });
    expect(await processStripeRefundEvent({ paymentIntentId: "pi_test_1", refundId: "re_linked" }, { client, listRefunds, findCheckoutSession })).toMatchObject({ ok: true });
    expect(client.table("orders")[0]).toMatchObject({ stripe_payment_intent_id: "pi_test_1", payment_status: "refunded" });
  });

  it.each([false, true])("links only the initial subscription invoice to a stand order (renewal=%s)", async (renewal) => {
    const stripe = {
      checkout: { sessions: { list: vi.fn()
        .mockResolvedValueOnce({ data: [], has_more: false })
        .mockResolvedValueOnce({ data: [{ id: "cs_sub", invoice: "in_initial", metadata: { checkout_intent: "hosted_subscription" } }], has_more: false }) } },
      invoicePayments: { list: vi.fn().mockResolvedValue({ data: [{ invoice: renewal ? "in_renewal" : "in_initial" }], has_more: false }) },
      invoices: { retrieve: vi.fn().mockResolvedValue({ id: renewal ? "in_renewal" : "in_initial", parent: { subscription_details: { subscription: "sub_order" } } }) },
    };
    const session = await findOrderCheckoutForPayment("pi_subscription", stripe as unknown as Parameters<typeof findOrderCheckoutForPayment>[1]);
    expect(session?.id ?? null).toBe(renewal ? null : "cs_sub");
    expect(stripe.invoicePayments.list).toHaveBeenCalledWith({ payment: { type: "payment_intent", payment_intent: "pi_subscription" }, limit: 100 });
  });

  it("ignores unrelated Stripe refunds without changing website orders", async () => {
    const client = new PaymentMemoryDb({ orders: [structuredClone(paidOrder)] });
    const listRefunds = vi.fn();
    const findCheckoutSession = vi.fn().mockResolvedValue(undefined);
    expect(await processStripeRefundEvent({ paymentIntentId: "pi_unrelated" }, { client, listRefunds, findCheckoutSession })).toMatchObject({ ok: true, reason: "not_order_refund" });
    expect(listRefunds).not.toHaveBeenCalled();
    expect(client.table("orders")[0].payment_status).toBe("paid");
  });

  it("fails closed for missing Stripe refund state and database errors", async () => {
    const client = new PaymentMemoryDb({ orders: [structuredClone(paidOrder)] });
    await expect(saveOrderRefundSummaryWithClient(client, paidOrder, [])).rejects.toThrow();
    client.failures.push({ table: "orders", action: "update", message: "DB failed" });
    await expect(saveOrderRefundSummaryWithClient(client, paidOrder, [{ id: "re_fail", amount: 5334, status: "pending", created: 100 }])).rejects.toThrow("DB failed");
    expect(client.table("orders")[0].payment_status).toBe("paid");
  });
});
