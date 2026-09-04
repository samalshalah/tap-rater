import { describe, expect, it, vi } from "vitest";
import { refundAdminOrder, type AdminOrderRefundDependencies } from "@/lib/order-refunds";
import type { OrderRecord } from "@/lib/orders";

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
    createRefund: vi.fn().mockResolvedValue({ id: "re_test_1" }),
    markRefunded: vi.fn().mockResolvedValue({ ok: true }),
    now: () => "2026-09-04T12:00:00.000Z",
  };
}

describe("admin order refunds", () => {
  it("creates an idempotent full refund and stores its reference", async () => {
    const dependencies = createDependencies(paidOrder);

    await expect(refundAdminOrder("order-1", dependencies)).resolves.toEqual({
      ok: true,
      refundId: "re_test_1",
      alreadyRefunded: false,
    });
    expect(dependencies.createRefund).toHaveBeenCalledWith(
      "pi_test_1",
      "order-1",
      "order-order-1-full-refund",
    );
    expect(dependencies.markRefunded).toHaveBeenCalledWith(
      "order-1",
      "re_test_1",
      "2026-09-04T12:00:00.000Z",
    );
  });

  it("does not call Stripe again for an already refunded order", async () => {
    const dependencies = createDependencies({
      ...paidOrder,
      status: "canceled",
      payment_status: "refunded",
      stripe_refund_id: "re_existing",
    });

    await expect(refundAdminOrder("order-1", dependencies)).resolves.toEqual({
      ok: true,
      refundId: "re_existing",
      alreadyRefunded: true,
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
});
