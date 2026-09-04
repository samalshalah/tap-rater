import { getStripeClient } from "@/lib/checkout";
import {
  getAdminOrderById,
  markAdminOrderRefunded,
  type OrderRecord,
} from "@/lib/orders";

type RefundCreationResult = {
  id: string;
};

export type AdminOrderRefundDependencies = {
  getOrder: (orderId: string) => Promise<{ configured: boolean; order: OrderRecord | null }>;
  createRefund: (
    paymentIntentId: string,
    orderId: string,
    idempotencyKey: string,
  ) => Promise<RefundCreationResult>;
  markRefunded: (
    orderId: string,
    refundId: string,
    refundedAt: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  now: () => string;
};

export type AdminOrderRefundResult =
  | { ok: true; refundId: string; alreadyRefunded: boolean }
  | { ok: false; status: number; error: string };

const defaultDependencies: AdminOrderRefundDependencies = {
  getOrder: getAdminOrderById,
  async createRefund(paymentIntentId, orderId, idempotencyKey) {
    const refund = await getStripeClient().refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
        metadata: { tap_rater_order_id: orderId },
      },
      { idempotencyKey },
    );
    return { id: refund.id };
  },
  markRefunded: markAdminOrderRefunded,
  now: () => new Date().toISOString(),
};

export async function refundAdminOrder(
  orderId: string,
  dependencies: AdminOrderRefundDependencies = defaultDependencies,
): Promise<AdminOrderRefundResult> {
  const { configured, order } = await dependencies.getOrder(orderId);

  if (!configured) {
    return { ok: false, status: 503, error: "Database persistence is not configured." };
  }
  if (!order) {
    return { ok: false, status: 404, error: "Order was not found." };
  }
  if (order.payment_status === "refunded" && order.stripe_refund_id) {
    return { ok: true, refundId: order.stripe_refund_id, alreadyRefunded: true };
  }
  if (order.status !== "paid" && order.payment_status !== "paid") {
    return { ok: false, status: 409, error: "Only paid orders can be refunded." };
  }
  if (!order.stripe_payment_intent_id) {
    return { ok: false, status: 409, error: "This order has no Stripe payment reference." };
  }

  try {
    const idempotencyKey = `order-${orderId}-full-refund`;
    const refund = await dependencies.createRefund(
      order.stripe_payment_intent_id,
      orderId,
      idempotencyKey,
    );
    const saved = await dependencies.markRefunded(
      orderId,
      refund.id,
      dependencies.now(),
    );

    if (!saved.ok) {
      return {
        ok: false,
        status: 500,
        error: `Stripe created the refund, but the order update failed: ${saved.error}`,
      };
    }

    return { ok: true, refundId: refund.id, alreadyRefunded: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe refund failed.";
    return { ok: false, status: 502, error: message };
  }
}
