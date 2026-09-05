import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNeonSupabaseAdapterFromUrl } from "@/lib/neon-supabase-adapter";
import { runCommerceRecovery } from "@/lib/commerce-recovery";
import { sendCommerceEmail } from "@/lib/commerce-email-outbox";
import { provisionPaidCustomerAccountFromOrder } from "@/lib/hosted-subscription-provisioning";
import type { OrderRecord } from "@/lib/orders";
const url = process.env.PHASE1_DATABASE_URL;
const expectedHost = process.env.PHASE1_DATABASE_HOST;
const enabled = Boolean(url && expectedHost && process.env.PHASE1_ALLOW_DATABASE_WRITES === "yes");
if (enabled && (new URL(url!).hostname !== expectedHost || (process.env.DATABASE_URL && new URL(url!).hostname === new URL(process.env.DATABASE_URL).hostname))) throw new Error("Refusing non-isolated integration database");
const client = enabled ? createNeonSupabaseAdapterFromUrl(url!) : null;

describe.skipIf(!enabled)("commerce recovery on isolated Postgres", () => {
  beforeEach(() => { vi.stubEnv("COMMERCE_RECOVERY_SECRET", "b".repeat(64)); vi.stubEnv("STRIPE_MODE", "test"); });
  afterEach(() => vi.unstubAllEnvs());
  it("persists a failed job and completes its retry without another completed run", async () => {
    const event = { id: `evt_qa_${randomUUID()}`, type: "checkout.session.completed", livemode: false,
      data: { object: { id: `cs_test_phase2_${randomUUID()}`, payment_status: "paid" } } } as unknown as Stripe.Event;
    const process = vi.fn().mockResolvedValueOnce(Response.json({ error: "Injected persistence failure" }, { status: 500 })).mockResolvedValue(Response.json({ received: true }));
    expect((await runCommerceRecovery(event, "https://taprater.test", { client: client!, process })).status).toBe(503);
    expect((await runCommerceRecovery(event, "https://taprater.test", { client: client!, process })).status).toBe(200);
    expect((await runCommerceRecovery(event, "https://taprater.test", { client: client!, process })).status).toBe(200);
    expect(process).toHaveBeenCalledTimes(2);
  }, 30_000);
  it("persists encrypted email and sends the identical request on retry", async () => {
    const id = `phase2-integration/${randomUUID()}`;
    const message = { to: "phase2@example.com", subject: "QA", html: "<p>Private fixture</p>", delivery: { idempotencyKey: id, messageType: "qa", audience: "customer" as const } };
    const send = vi.fn().mockResolvedValueOnce({ sent: false, reason: "injected timeout" }).mockResolvedValue({ sent: true });
    expect(await sendCommerceEmail(message, { client: client!, send })).toMatchObject({ sent: false });
    const stored = await client!.from("commerce_email_outbox").select("*").eq("id", id).maybeSingle<any>();
    expect(stored.data?.payload).not.toContain("Private fixture");
    expect(await sendCommerceEmail({ ...message, html: "Changed" }, { client: client!, send })).toEqual({ sent: true });
    expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0]);
    expect(await sendCommerceEmail(message, { client: client!, send })).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(2);
    const accepted = await client!.from("commerce_email_outbox").select("payload").eq("id", id).maybeSingle<any>();
    expect(accepted.data?.payload).toBeNull();
  }, 30_000);
  it("reuses account and activation credentials after an injected mail failure", async () => {
    const id = randomUUID();
    const order = { id, stripe_checkout_session_id: `cs_test_phase2_${id}`, email: `phase2-${id}@example.com`, customer_name: "Phase 2 integration QA",
      status: "paid", payment_status: "paid", line_items_json: [], customer_details_json: { create_account: true } } as unknown as OrderRecord;
    const sendPaidCustomerAccountSetupEmailFn = vi.fn().mockResolvedValueOnce({ sent: false, reason: "injected timeout" }).mockResolvedValue({ sent: true });
    const dependencies = { client: client!, storage: { getText: async () => null, putText: async () => {}, putTextIfAbsent: async () => true }, sendPaidCustomerAccountSetupEmailFn };
    expect(await provisionPaidCustomerAccountFromOrder({ order }, dependencies)).toMatchObject({ ok: false });
    expect(await provisionPaidCustomerAccountFromOrder({ order }, dependencies)).toMatchObject({ ok: true });
    expect(sendPaidCustomerAccountSetupEmailFn.mock.calls[1][0].activationToken).toBe(sendPaidCustomerAccountSetupEmailFn.mock.calls[0][0].activationToken);
    const customers = await client!.from("customers").select("id").eq("email", order.email);
    expect(customers.data).toHaveLength(1);
    const businesses = await client!.from("businesses").select("id").eq("customer_id", (customers.data![0] as any).id);
    expect(businesses.data).toHaveLength(1);
  }, 30_000);
});
