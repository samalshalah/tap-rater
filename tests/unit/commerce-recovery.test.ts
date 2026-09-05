import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";
import { runCommerceRecovery } from "@/lib/commerce-recovery";
import { sendCommerceEmail } from "@/lib/commerce-email-outbox";
import { decryptCommerceData, encryptCommerceData } from "@/lib/commerce-encryption";
import { provisionPaidCustomerAccountFromOrder } from "@/lib/hosted-subscription-provisioning";
import type { OrderRecord } from "@/lib/orders";

const now = new Date("2026-09-05T18:00:00Z");
const event = { id: "evt_phase2", type: "checkout.session.completed", livemode: false,
  data: { object: { id: "cs_test_phase2", payment_status: "paid" } } } as unknown as Stripe.Event;
const message = { to: "qa@example.com", subject: "Order receipt", html: "<p>Original receipt</p>",
  delivery: { messageType: "paid_order_customer", audience: "customer" as const, entityId: "order-test", idempotencyKey: "phase2/order-test" } };

beforeEach(() => { vi.stubEnv("COMMERCE_RECOVERY_SECRET", "a".repeat(64)); vi.stubEnv("STRIPE_MODE", "test"); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("durable commerce recovery", () => {
  it("keeps failures retryable, records success, and suppresses completed checkout duplicates", async () => {
    const client = new PaymentMemoryDb();
    const process = vi.fn().mockResolvedValueOnce(Response.json({ error: "Invoice storage unavailable" }, { status: 500 }))
      .mockResolvedValue(Response.json({ received: true }));
    expect((await runCommerceRecovery(event, "https://taprater.test", { client, process })).status).toBe(503);
    expect(client.table("commerce_recovery_jobs")[0]).toMatchObject({ status: "failed", attempts: 1, last_error: "Invoice storage unavailable" });
    expect((await runCommerceRecovery(event, "https://taprater.test", { client, process })).status).toBe(200);
    expect((await runCommerceRecovery({ ...event, id: "evt_duplicate" }, "https://taprater.test", { client, process })).status).toBe(200);
    expect(process).toHaveBeenCalledTimes(2);
    expect(client.table("commerce_recovery_jobs")[0]).toMatchObject({ status: "completed", attempts: 2 });
  });

  it("does not run side effects when the initial recovery write fails", async () => {
    const client = new PaymentMemoryDb();
    client.failures.push({ table: "commerce_recovery_jobs", action: "upsert", message: "offline" });
    const process = vi.fn();
    expect((await runCommerceRecovery(event, "https://taprater.test", { client, process })).status).toBe(503);
    expect(process).not.toHaveBeenCalled();
  });

  it("retains pending work when saving the completion result fails", async () => {
    const client = new PaymentMemoryDb();
    client.failures.push({ table: "commerce_recovery_jobs", action: "update", message: "offline" });
    const process = vi.fn().mockResolvedValue(Response.json({ received: true }));
    expect((await runCommerceRecovery(event, "https://taprater.test", { client, process })).status).toBe(503);
    expect(client.table("commerce_recovery_jobs")[0].status).toBe("pending");
    expect((await runCommerceRecovery(event, "https://taprater.test", { client, process })).status).toBe(200);
  });

  it("rejects live events in test mode", async () => {
    const process = vi.fn();
    expect((await runCommerceRecovery({ ...event, livemode: true }, "https://taprater.test", { client: new PaymentMemoryDb(), process })).status).toBe(400);
    expect(process).not.toHaveBeenCalled();
  });

  it("reprocesses invoice updates rather than permanently consuming the invoice ID", async () => {
    const client = new PaymentMemoryDb();
    const invoiceEvent = { ...event, type: "invoice.paid", data: { object: { id: "in_phase2" } } } as unknown as Stripe.Event;
    const process = vi.fn().mockResolvedValue(Response.json({ received: true }));
    await runCommerceRecovery(invoiceEvent, "https://taprater.test", { client, process });
    await runCommerceRecovery(invoiceEvent, "https://taprater.test", { client, process });
    expect(process).toHaveBeenCalledTimes(2);
  });
});

describe("commerce email outbox", () => {
  it("encrypts immutable requests, retries them unchanged, and never resends accepted mail", async () => {
    const client = new PaymentMemoryDb();
    const send = vi.fn().mockResolvedValueOnce({ sent: false, reason: "timeout" }).mockResolvedValue({ sent: true });
    expect(await sendCommerceEmail(message, { client, send, now })).toMatchObject({ sent: false });
    const payload = client.table("commerce_email_outbox")[0].payload;
    expect(payload).not.toContain("Original receipt");
    expect(payload).not.toContain(message.to);
    expect(await sendCommerceEmail({ ...message, html: "Changed template" }, { client, send, now })).toEqual({ sent: true });
    expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0]);
    expect(await sendCommerceEmail(message, { client, send, now: new Date("2026-09-10") })).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(2);
    expect(client.table("commerce_email_outbox")[0]).toMatchObject({ status: "accepted", payload: null });
  });

  it("does not send if the durable outbox write fails", async () => {
    const client = new PaymentMemoryDb();
    client.failures.push({ table: "commerce_email_outbox", action: "insert", message: "offline" });
    const send = vi.fn();
    expect(await sendCommerceEmail(message, { client, send, now })).toMatchObject({ sent: false });
    expect(send).not.toHaveBeenCalled();
  });

  it("recovers a provider acceptance after a lost outbox acknowledgement without another send", async () => {
    const client = new PaymentMemoryDb();
    const send = vi.fn(async () => {
      client.table("email_deliveries").push({ idempotency_key: message.delivery.idempotencyKey, status: "accepted", provider_message_id: "email_test" });
      client.failures.push({ table: "commerce_email_outbox", action: "update", message: "offline" });
      return { sent: true as const };
    });
    expect(await sendCommerceEmail(message, { client, send, now })).toMatchObject({ sent: false });
    expect(await sendCommerceEmail(message, { client, send, now })).toEqual({ sent: true });
    expect(send).toHaveBeenCalledOnce();
  });

  it("blocks unknown outcomes beyond the provider deduplication window", async () => {
    const client = new PaymentMemoryDb();
    const send = vi.fn().mockResolvedValue({ sent: false, reason: "timeout" });
    await sendCommerceEmail(message, { client, send, now });
    expect(await sendCommerceEmail(message, { client, send, now: new Date(now.getTime() + 24 * 3600000) })).toEqual({ sent: false, reason: "email_outcome_needs_review" });
    expect(client.table("commerce_email_outbox")[0].status).toBe("needs_review");
    expect(send).toHaveBeenCalledOnce();
  });

  it("requires review for historical mail with no reliable acceptance record", async () => {
    const send = vi.fn();
    expect(await sendCommerceEmail(message, { client: new PaymentMemoryDb(), send, now, sourceCreatedAt: "2026-09-01T00:00:00Z" })).toMatchObject({ sent: false, reason: "email_outcome_needs_review" });
    expect(send).not.toHaveBeenCalled();
  });

  it("fails closed on missing encryption configuration and tampered ciphertext", async () => {
    const encrypted = encryptCommerceData({ token: "private" }, "context-a");
    expect(() => decryptCommerceData(encrypted, "context-b")).toThrow();
    vi.stubEnv("COMMERCE_RECOVERY_SECRET", "");
    const send = vi.fn();
    expect(await sendCommerceEmail(message, { client: new PaymentMemoryDb(), send, now })).toMatchObject({ sent: false });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("paid account recovery", () => {
  const order = { id: "order-test", stripe_checkout_session_id: "cs_test_account", email: "qa@example.com", customer_name: "QA",
    status: "paid", payment_status: "paid", line_items_json: [], customer_details_json: { create_account: true } } as unknown as OrderRecord;
  const storage = { getText: async () => null, putText: async () => {}, putTextIfAbsent: async () => true };
  it("reuses the customer, business, and activation token after an email failure", async () => {
    const client = new PaymentMemoryDb();
    const sendPaidCustomerAccountSetupEmailFn = vi.fn().mockResolvedValueOnce({ sent: false, reason: "timeout" }).mockResolvedValue({ sent: true });
    const dependencies = { client, storage, sendPaidCustomerAccountSetupEmailFn };
    expect(await provisionPaidCustomerAccountFromOrder({ order, now }, dependencies)).toMatchObject({ ok: false });
    const hash = client.table("customers")[0].activation_token_hash;
    expect(client.table("stripe_events")).toHaveLength(0);
    expect(await provisionPaidCustomerAccountFromOrder({ order, now }, dependencies)).toMatchObject({ ok: true });
    expect(client.table("customers")).toHaveLength(1);
    expect(client.table("businesses")).toHaveLength(1);
    expect(client.table("customers")[0].activation_token_hash).toBe(hash);
    expect(sendPaidCustomerAccountSetupEmailFn.mock.calls[1][0].activationToken).toBe(sendPaidCustomerAccountSetupEmailFn.mock.calls[0][0].activationToken);
    await provisionPaidCustomerAccountFromOrder({ order, now }, dependencies);
    expect(sendPaidCustomerAccountSetupEmailFn).toHaveBeenCalledTimes(2);
  });

  it("never reactivates a disabled account through a paid-order retry", async () => {
    const client = new PaymentMemoryDb({ customers: [{ id: "customer-test", email: order.email, account_status: "disabled" }] });
    const sendPaidCustomerAccountSetupEmailFn = vi.fn();
    expect(await provisionPaidCustomerAccountFromOrder({ order, now }, { client, storage, sendPaidCustomerAccountSetupEmailFn })).toMatchObject({ ok: false });
    expect(client.table("customers")[0].account_status).toBe("disabled");
    expect(sendPaidCustomerAccountSetupEmailFn).not.toHaveBeenCalled();
  });

  it("does not rotate an expired link during an old payment retry", async () => {
    const client = new PaymentMemoryDb({ customers: [{ id: "customer-test", email: order.email, account_status: "pending_activation",
      activation_token_hash: "old", activation_expires_at: "2026-09-01T00:00:00Z" }] });
    expect(await provisionPaidCustomerAccountFromOrder({ order, now }, { client, storage })).toMatchObject({ ok: false });
    expect(client.table("customers")[0].activation_token_hash).toBe("old");
  });
});
