import { getStripeClient } from "@/lib/checkout";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getAdminOrderById, type OrderRecord, type OrdersDbClient } from "@/lib/orders";
import { withStripeResourceLock, type StripeProcessingGuard } from "@/lib/stripe-processing";

export type StripeRefundState = {
  id: string;
  amount: number;
  status: string | null;
  payment_intent?: string | { id: string } | null;
  failure_reason?: string;
  created: number;
};
export type RefundSummary = {
  refundId: string;
  refundStatus: string;
  refundedAmountCents: number;
  pendingAmountCents: number;
  paymentStatus: string;
  failureReason: string | null;
};
export type AdminOrderRefundResult =
  | { ok: true; refundId: string; refundStatus: string; alreadyRefunded: boolean }
  | { ok: false; status: number; error: string };
export type AdminOrderRefundDependencies = {
  getOrder: typeof getAdminOrderById;
  listRefunds: (paymentIntentId: string) => Promise<StripeRefundState[]>;
  createRefund: (paymentIntentId: string, orderId: string, idempotencyKey: string) => Promise<StripeRefundState>;
  saveRefunds: (order: OrderRecord, refunds: StripeRefundState[]) => Promise<RefundSummary>;
  withLock: (key: string, work: (assertActive: StripeProcessingGuard) => Promise<AdminOrderRefundResult>) => Promise<AdminOrderRefundResult>;
};

export function summarizeRefunds(order: Pick<OrderRecord, "total_cents">, refunds: StripeRefundState[]): RefundSummary {
  if (!refunds.length) throw new Error("Stripe has not returned the refund yet. Retry reconciliation.");
  const unique = [...new Map(refunds.map((refund) => [refund.id, refund])).values()];
  for (const refund of unique) {
    if (!refund.id || !Number.isSafeInteger(refund.amount) || refund.amount < 0 ||
      !["pending", "requires_action", "succeeded", "failed", "canceled"].includes(refund.status ?? "")) {
      throw new Error("Stripe returned an unrecognized refund state.");
    }
  }
  const refundedAmountCents = unique.filter((r) => r.status === "succeeded").reduce((sum, r) => sum + r.amount, 0);
  const pending = unique.filter((r) => r.status === "pending" || r.status === "requires_action");
  const pendingAmountCents = pending.reduce((sum, r) => sum + r.amount, 0);
  const latest = [...unique].sort((a, b) => b.created - a.created || b.id.localeCompare(a.id))[0];
  const full = order.total_cents > 0 && refundedAmountCents >= order.total_cents;
  const failure = [...unique].sort((a, b) => b.created - a.created).find((r) => r.status === "failed" || r.status === "canceled");
  return {
    refundId: latest.id,
    refundStatus: full ? "succeeded" : pending.some((r) => r.status === "requires_action") ? "requires_action"
      : pending.length ? "pending" : refundedAmountCents > 0 ? "partially_refunded" : failure?.status ?? "pending",
    refundedAmountCents,
    pendingAmountCents,
    paymentStatus: full ? "refunded" : pending.length ? "refund_pending" : refundedAmountCents > 0 ? "partially_refunded" : "refund_failed",
    failureReason: full || pending.length ? null : failure?.failure_reason ?? (failure ? `Refund ${failure.status}. Review in Stripe.` : null),
  };
}

export async function listStripeRefunds(paymentIntentId: string): Promise<StripeRefundState[]> {
  const refunds: StripeRefundState[] = [];
  for await (const refund of getStripeClient().refunds.list({ payment_intent: paymentIntentId, limit: 100 })) refunds.push(refund);
  return refunds;
}

export async function findOrderCheckoutForPayment(paymentIntentId: string, stripe = getStripeClient()) {
  const direct = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 100 });
  if (direct.has_more) throw new Error("Payment has too many checkout references. Review in Stripe.");
  const isManaged = (session: { metadata: Record<string, string> | null }) =>
    session.metadata?.checkout_intent === "direct_payment" || session.metadata?.checkout_intent === "hosted_subscription";
  const session = direct.data.find(isManaged);
  if (session) return session;

  // Subscription Checkout Sessions do not expose their invoice's PaymentIntent.
  // Resolve the initial invoice explicitly; renewal refunds are not stand orders.
  const payments = await stripe.invoicePayments.list({ payment: { type: "payment_intent", payment_intent: paymentIntentId }, limit: 100 });
  const invoiceIds = [...new Set(payments.data.map(payment => typeof payment.invoice === "string" ? payment.invoice : payment.invoice.id))];
  if (payments.has_more || invoiceIds.length > 1) throw new Error("Refund has ambiguous invoice references. Review in Stripe.");
  if (!invoiceIds.length) return null;
  const invoice = await stripe.invoices.retrieve(invoiceIds[0]);
  const subscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
  if (!subscriptionId) return null;
  const sessions = await stripe.checkout.sessions.list({ subscription: subscriptionId, limit: 100 });
  if (sessions.has_more) throw new Error("Subscription has too many checkout references. Review in Stripe.");
  return sessions.data.find(session => isManaged(session) &&
    (typeof session.invoice === "string" ? session.invoice : session.invoice?.id) === invoice.id) ?? null;
}

export async function saveOrderRefundSummaryWithClient(client: OrdersDbClient, order: OrderRecord, refunds: StripeRefundState[]) {
  const summary = summarizeRefunds(order, refunds);
  const now = new Date().toISOString();
  const saved = await client.from("orders").update({
    status: summary.paymentStatus === "refunded" ? "canceled" : "paid",
    payment_status: summary.paymentStatus,
    stripe_refund_id: summary.refundId,
    refund_status: summary.refundStatus,
    refunded_amount_cents: summary.refundedAmountCents,
    refund_pending_amount_cents: summary.pendingAmountCents,
    refund_failure_reason: summary.failureReason,
    refunded_at: summary.paymentStatus === "refunded" ? order.refunded_at ?? now : null,
    updated_at: now,
  }).eq("id", order.id).eq("stripe_payment_intent_id", order.stripe_payment_intent_id).select("id").maybeSingle();
  if (saved.error || !saved.data) throw new Error(saved.error?.message ?? "Refund order could not be updated.");
  return summary;
}

const defaultDependencies: AdminOrderRefundDependencies = {
  getOrder: getAdminOrderById,
  listRefunds: listStripeRefunds,
  createRefund: (paymentIntentId, orderId, idempotencyKey) => getStripeClient().refunds.create({
    payment_intent: paymentIntentId, reason: "requested_by_customer", metadata: { tap_rater_order_id: orderId },
  }, { idempotencyKey }),
  saveRefunds: (order, refunds) => saveOrderRefundSummaryWithClient(getSupabaseAdmin(), order, refunds),
  withLock: async (key, work) => {
    const result = await withStripeResourceLock(getSupabaseAdmin(), key, async (assertActive) => {
      await assertActive();
      return work(assertActive);
    });
    return result.ok ? result : { ...result, status: "status" in result ? result.status : 503 };
  },
};

export async function refundAdminOrder(orderId: string, dependencies = defaultDependencies): Promise<AdminOrderRefundResult> {
  const initial = await dependencies.getOrder(orderId);
  if (!initial.configured) return { ok: false, status: 503, error: "Database persistence is not configured." };
  if (!initial.order) return { ok: false, status: 404, error: "Order was not found." };
  if (!initial.order.stripe_payment_intent_id) return { ok: false, status: 409, error: "This order has no Stripe payment reference." };
  const paymentIntentId = initial.order.stripe_payment_intent_id;
  return dependencies.withLock(`payment:${paymentIntentId}`, async (assertActive) => {
    try {
      const { order } = await dependencies.getOrder(orderId);
      if (!order || order.stripe_payment_intent_id !== paymentIntentId) return { ok: false, status: 409, error: "Order payment reference changed." };
      if (order.status !== "paid" && order.payment_status !== "paid" && !order.payment_status?.includes("refund")) {
        return { ok: false, status: 409, error: "Only paid orders can be refunded." };
      }
      // Check Stripe before creating anything, including retries beyond Stripe's
      // idempotency-key retention window or after a previous database failure.
      const existing = await dependencies.listRefunds(paymentIntentId);
      await assertActive();
      if (existing.length) {
        const summary = await dependencies.saveRefunds(order, existing);
        return { ok: true, refundId: summary.refundId, refundStatus: summary.refundStatus, alreadyRefunded: summary.paymentStatus === "refunded" };
      }
      if (order.stripe_refund_id || order.payment_status?.includes("refund")) {
        return { ok: false, status: 409, error: "Recorded refund was not found in Stripe. Review before retrying." };
      }
      const refund = await dependencies.createRefund(paymentIntentId, orderId, `order-${orderId}-full-refund`);
      try {
        await assertActive();
        const summary = await dependencies.saveRefunds(order, [refund]);
        return { ok: true, refundId: refund.id, refundStatus: summary.refundStatus, alreadyRefunded: false };
      } catch {
        return { ok: false, status: 500, error: "Stripe accepted the refund request, but its local status could not be saved. Retry to reconcile; do not create another refund." };
      }
    } catch (error) {
      return { ok: false, status: 502, error: error instanceof Error ? error.message : "Stripe refund failed." };
    }
  });
}

export async function processStripeRefundEvent(
  input: { paymentIntentId: string; refundId?: string },
  dependencies?: { client: OrdersDbClient; listRefunds: typeof listStripeRefunds; findCheckoutSession?: (paymentIntentId: string) => Promise<{ id: string } | null> },
) {
  if (!dependencies && !hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  const client = dependencies?.client ?? getSupabaseAdmin();
  return withStripeResourceLock(client, `payment:${input.paymentIntentId}`, async (assertActive) => {
    let lookup = await client.from("orders").select("*").eq("stripe_payment_intent_id", input.paymentIntentId).maybeSingle();
    if (lookup.error) return { ok: false as const, error: lookup.error.message };
    if (!lookup.data && (!dependencies || dependencies.findCheckoutSession)) {
      const session = dependencies?.findCheckoutSession
        ? await dependencies.findCheckoutSession(input.paymentIntentId)
        : await findOrderCheckoutForPayment(input.paymentIntentId);
      if (!session) return { ok: true as const, reason: "not_order_refund" };
      lookup = await client.from("orders").select("*").eq("stripe_checkout_session_id", session.id).maybeSingle();
      if (lookup.error) return { ok: false as const, error: lookup.error.message };
      if (lookup.data && !lookup.data.stripe_payment_intent_id) {
        await assertActive();
        const linked = await client.from("orders").update({ stripe_payment_intent_id: input.paymentIntentId })
          .eq("id", lookup.data.id).eq("stripe_payment_intent_id", null).select("*").maybeSingle();
        if (linked.error || !linked.data) return { ok: false as const, error: "Refund payment reference could not be linked. Retry this event." };
        lookup = linked;
      }
      if (lookup.data?.stripe_payment_intent_id !== input.paymentIntentId) return { ok: false as const, error: "Refund payment reference does not match the order." };
    }
    // A refund can beat the Checkout webhook. Keep it retryable instead of
    // acknowledging and silently losing its terminal payment state.
    if (!lookup.data) return { ok: false as const, error: "Refund order is not available yet. Retry this event." };
    const refunds = await (dependencies?.listRefunds ?? listStripeRefunds)(input.paymentIntentId);
    if (input.refundId && !refunds.some((refund) => refund.id === input.refundId)) {
      return { ok: false as const, error: "Stripe refund is not available yet. Retry this event." };
    }
    await assertActive();
    await saveOrderRefundSummaryWithClient(client, lookup.data, refunds);
    return { ok: true as const };
  });
}
