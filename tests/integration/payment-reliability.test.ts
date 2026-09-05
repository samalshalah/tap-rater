import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createNeonSupabaseAdapterFromUrl } from "@/lib/neon-supabase-adapter";
import { savePaidOrderFromCheckoutSessionWithClient, type OrderRecord } from "@/lib/orders";
import { processStripeRefundEvent } from "@/lib/order-refunds";
import { completeStripeReceipt, hasStripeReceipt, withStripeResourceLock } from "@/lib/stripe-processing";

const url = process.env.PHASE1_DATABASE_URL;
const expectedHost = process.env.PHASE1_DATABASE_HOST;
const enabled = Boolean(url && expectedHost && process.env.PHASE1_ALLOW_DATABASE_WRITES === "yes");
if (enabled && (new URL(url!).hostname !== expectedHost ||
  (process.env.DATABASE_URL && new URL(url!).hostname === new URL(process.env.DATABASE_URL).hostname))) {
  throw new Error("Refusing payment validation outside the isolated database branch");
}
const client = enabled ? createNeonSupabaseAdapterFromUrl(url!) : null;

describe.skipIf(!enabled)("payment reliability on isolated Postgres", () => {
  it("targets only the explicitly selected validation branch", () => {
    expect(new URL(url!).hostname).toBe(expectedHost);
    if (process.env.DATABASE_URL) expect(new URL(url!).hostname).not.toBe(new URL(process.env.DATABASE_URL).hostname);
  });

  async function createOrder() {
    if (new URL(url!).hostname !== expectedHost) throw new Error("Validation database host mismatch");
    if (process.env.DATABASE_URL && new URL(url!).hostname === new URL(process.env.DATABASE_URL).hostname) throw new Error("Refusing application database");
    const order = {
      id: randomUUID(), stripe_checkout_session_id: `cs_test_phase1_${randomUUID()}`,
      stripe_payment_intent_id: `pi_phase1_${randomUUID()}`, status: "pending_payment", payment_status: "unpaid",
      total_cents: 5334, subtotal_cents: 3900, currency: "usd", line_items_json: [],
    };
    const result = await client!.from("orders").insert(order).select("*").maybeSingle<OrderRecord>();
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Fixture insert failed");
    return result.data;
  }

  it("confirms a concurrent paid checkout only once", async () => {
    const order = await createOrder();
    const session = { id: order.stripe_checkout_session_id, payment_intent: order.stripe_payment_intent_id, payment_status: "paid", amount_total: 5334 };
    const results = await Promise.all([
      savePaidOrderFromCheckoutSessionWithClient(client!, session),
      savePaidOrderFromCheckoutSessionWithClient(client!, session),
    ]);
    expect(results.filter(result => result.ok && !result.wasAlreadyPaid)).toHaveLength(1);
    const retry = await savePaidOrderFromCheckoutSessionWithClient(client!, session);
    expect(retry).toMatchObject({ ok: true, wasAlreadyPaid: true });
  }, 30_000);

  it("persists pending/successful refunds and prevents checkout resurrection", async () => {
    const order = await createOrder();
    const session = { id: order.stripe_checkout_session_id, payment_intent: order.stripe_payment_intent_id, payment_status: "paid", amount_total: 5334 };
    expect(await savePaidOrderFromCheckoutSessionWithClient(client!, session)).toMatchObject({ ok: true });
    const input = { paymentIntentId: order.stripe_payment_intent_id!, refundId: `re_phase1_${randomUUID()}` };
    const refund = { id: input.refundId, amount: 5334, created: Math.floor(Date.now() / 1000), status: "pending" };
    expect(await processStripeRefundEvent(input, { client: client!, listRefunds: async () => [refund] })).toMatchObject({ ok: true });
    let stored = await client!.from("orders").select("*").eq("id", order.id).maybeSingle<any>();
    expect(stored.data).toMatchObject({ payment_status: "refund_pending", refund_pending_amount_cents: 5334, refunded_amount_cents: 0 });
    expect(await processStripeRefundEvent(input, { client: client!, listRefunds: async () => [{ ...refund, status: "succeeded" }] })).toMatchObject({ ok: true });
    expect(await savePaidOrderFromCheckoutSessionWithClient(client!, session)).toMatchObject({ ok: true, paymentReversed: true });
    stored = await client!.from("orders").select("*").eq("id", order.id).maybeSingle<any>();
    expect(stored.data).toMatchObject({ status: "canceled", payment_status: "refunded", refunded_amount_cents: 5334 });
  }, 30_000);

  it("serializes workers and permits a later retry after failure", async () => {
    const key = `payment:phase1_${randomUUID()}`;
    let entered!: () => void;
    let release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const first = withStripeResourceLock(client!, key, async guard => { await guard(); entered(); await held; throw new Error("Injected interruption"); });
    await started;
    try {
      expect(await withStripeResourceLock(client!, key, async () => ({ ok: true }))).toMatchObject({ ok: false });
    } finally { release(); }
    expect(await first).toMatchObject({ ok: false });
    expect(await withStripeResourceLock(client!, key, async guard => { await guard(); return { ok: true }; })).toMatchObject({ ok: true });
  }, 30_000);

  it("stores completion receipts only after an explicit successful completion", async () => {
    const id = `evt_phase1_${randomUUID()}:v2`;
    expect(await hasStripeReceipt(client!, id)).toBe(false);
    await completeStripeReceipt(client!, id, "invoice.paid");
    expect(await hasStripeReceipt(client!, id)).toBe(true);
  }, 30_000);
});
