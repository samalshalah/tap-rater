import { describe, expect, it, vi } from "vitest";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";
import {
  hostedSubscriptionGracePeriodDays,
  processHostedSubscriptionLifecycleEvent
} from "@/lib/hosted-subscription-lifecycle";
import { assignPermanentHostedPageCode, publishHostedPageSnapshot, type HostedPagePutOptions, type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import type { HostedPageSnapshot } from "@/lib/hosted-pages/snapshots";
import type { OrdersDbClient } from "@/lib/orders";

const code = "ABCDEFGHJKM2";

describe("hosted subscription lifecycle processing", () => {
  it("maps customer.subscription.updated to ACTIVE without changing the permanent code", async () => {
    const { client, storage } = await createSeededRuntime();
    const result = await processHostedSubscriptionLifecycleEvent(
      {
        eventId: "evt_active",
        eventType: "customer.subscription.updated",
        object: { id: "sub_test_123", status: "active", current_period_end: 1_800_000_000 },
        now: new Date("2026-08-24T00:00:00.000Z")
      },
      { client, storage, retrieveSubscription: async () => ({ id: "sub_test_123", status: "active", current_period_end: 1_800_000_000 }) }
    );

    expect(result).toMatchObject({ ok: true, processed: true, code, lifecycleStatus: "ACTIVE" });
    expect(client.table("hosted_subscriptions")[0]).toMatchObject({
      permanent_code: code,
      lifecycle_status: "ACTIVE",
      current_period_end: "2027-01-15T08:00:00.000Z",
      past_due_since: null,
      grace_ends_at: null
    });
    expect(client.table("hosted_page_editor_pages")[0].lifecycle_status).toBe("ACTIVE");
  });

  it("maps cancel_at_period_end to CANCELLED_AT_PERIOD_END and keeps the same URL live until paid-through", async () => {
    const { client, storage } = await createSeededRuntime();

    await processHostedSubscriptionLifecycleEvent(
      {
        eventId: "evt_cancel_period_end",
        eventType: "customer.subscription.updated",
        object: { id: "sub_test_123", status: "active", cancel_at_period_end: true, current_period_end: 1_800_000_000 },
        now: new Date("2026-08-24T00:00:00.000Z")
      },
      { client, storage, retrieveSubscription: async () => ({ id: "sub_test_123", status: "active", cancel_at_period_end: true, current_period_end: 1_800_000_000 }) }
    );

    expect(client.table("hosted_subscriptions")[0]).toMatchObject({
      permanent_code: code,
      hosted_page_url: `https://taprater.com/p/${code}`,
      lifecycle_status: "CANCELLED_AT_PERIOD_END",
      cancel_at_period_end: true
    });
    expect(client.table("hosted_page_editor_pages")[0]).toMatchObject({ code, lifecycle_status: "CANCELLED_AT_PERIOD_END" });
  });

  it("maps invoice.payment_failed to PAST_DUE with a 7-day grace period", async () => {
    const { client, storage } = await createSeededRuntime();
    const now = new Date("2026-08-24T12:00:00.000Z");

    await processHostedSubscriptionLifecycleEvent(
      {
        eventId: "evt_payment_failed",
        eventType: "invoice.payment_failed",
        object: { parent: { subscription_details: { subscription: "sub_test_123" } } },
        now
      },
      { client, storage, retrieveSubscription: async () => ({ id: "sub_test_123", status: "past_due" }) }
    );

    expect(hostedSubscriptionGracePeriodDays).toBe(7);
    expect(client.table("hosted_subscriptions")[0]).toMatchObject({
      permanent_code: code,
      lifecycle_status: "PAST_DUE",
      status: "past_due",
      past_due_since: "2026-08-24T12:00:00.000Z",
      grace_ends_at: "2026-08-31T12:00:00.000Z"
    });
  });

  it("maps invoice.paid after past due back to ACTIVE and clears grace state", async () => {
    const { client, storage } = await createSeededRuntime({
      lifecycle_status: "PAST_DUE",
      status: "past_due",
      past_due_since: "2026-08-24T12:00:00.000Z",
      grace_ends_at: "2026-08-31T12:00:00.000Z"
    });

    await processHostedSubscriptionLifecycleEvent(
      {
        eventId: "evt_invoice_paid",
        eventType: "invoice.paid",
        object: { parent: { subscription_details: { subscription: "sub_test_123" } } },
        now: new Date("2026-08-25T12:00:00.000Z")
      },
      { client, storage, retrieveSubscription: async () => ({ id: "sub_test_123", status: "active" }) }
    );

    expect(client.table("hosted_subscriptions")[0]).toMatchObject({
      permanent_code: code,
      lifecycle_status: "ACTIVE",
      status: "active",
      past_due_since: null,
      grace_ends_at: null
    });
  });

  it("maps customer.subscription.deleted to EXPIRED while preserving the same permanent URL", async () => {
    const { client, storage } = await createSeededRuntime();

    await processHostedSubscriptionLifecycleEvent(
      {
        eventId: "evt_deleted",
        eventType: "customer.subscription.deleted",
        object: { id: "sub_test_123", status: "canceled", current_period_end: 1_800_000_000 },
        now: new Date("2026-08-24T00:00:00.000Z")
      },
      { client, storage, retrieveSubscription: async () => ({ id: "sub_test_123", status: "canceled", current_period_end: 1_800_000_000 }) }
    );

    expect(client.table("hosted_subscriptions")[0]).toMatchObject({
      permanent_code: code,
      hosted_page_url: `https://taprater.com/p/${code}`,
      lifecycle_status: "EXPIRED",
      status: "canceled"
    });
    expect(client.table("hosted_page_editor_pages")[0]).toMatchObject({ code, lifecycle_status: "EXPIRED" });
  });

  it("is idempotent for duplicate Stripe lifecycle event IDs", async () => {
    const { client, storage } = await createSeededRuntime();
    const first = await processHostedSubscriptionLifecycleEvent(
      {
        eventId: "evt_duplicate_lifecycle",
        eventType: "invoice.payment_failed",
        object: { subscription: "sub_test_123" },
        now: new Date("2026-08-24T12:00:00.000Z")
      },
      { client, storage, retrieveSubscription: async () => ({ id: "sub_test_123", status: "past_due" }) }
    );
    const second = await processHostedSubscriptionLifecycleEvent(
      {
        eventId: "evt_duplicate_lifecycle",
        eventType: "invoice.paid",
        object: { subscription: "sub_test_123" },
        now: new Date("2026-08-25T12:00:00.000Z")
      },
      { client, storage, retrieveSubscription: async () => ({ id: "sub_test_123", status: "active" }) }
    );

    expect(first).toMatchObject({ ok: true, processed: true });
    expect(second).toEqual({ ok: true, processed: false, reason: "duplicate_event" });
    expect(client.table("stripe_events")).toHaveLength(1);
    expect(client.table("hosted_subscriptions")[0].lifecycle_status).toBe("PAST_DUE");
  });

  it("blocks retired code reassignment through the permanent-code repository", async () => {
    const storage = new MemoryHostedStorage();
    await assignPermanentHostedPageCode(storage, { physicalProductRef: "original-product", code });

    await expect(assignPermanentHostedPageCode(storage, { physicalProductRef: "another-product", code })).rejects.toThrow("already assigned");
  });

  it("retries the same event after a database failure without recording success early", async () => {
    const runtime = await createSeededRuntime();
    runtime.client.failures.push({ table: "hosted_subscriptions", action: "select", message: "temporary outage" });
    const input = { eventId: "evt_retry", eventType: "invoice.paid" as const, object: { subscription: "sub_test_123" } };
    const deps = { ...runtime, retrieveSubscription: vi.fn(async () => ({ id: "sub_test_123", status: "active" })) };
    expect(await processHostedSubscriptionLifecycleEvent(input, deps)).toMatchObject({ ok: false });
    expect(runtime.client.table("stripe_events")).toHaveLength(0);
    expect(await processHostedSubscriptionLifecycleEvent(input, deps)).toMatchObject({ ok: true, processed: true });
    expect(deps.retrieveSubscription).toHaveBeenCalledTimes(2);
  });

  it("retries a snapshot publication failure even after database updates succeed", async () => {
    const runtime = await createSeededRuntime();
    vi.spyOn(runtime.storage, "putText").mockRejectedValueOnce(new Error("R2 unavailable"));
    const input = { eventId: "evt_r2_retry", eventType: "invoice.payment_failed" as const, object: { subscription: "sub_test_123" } };
    const deps = { ...runtime, retrieveSubscription: async () => ({ id: "sub_test_123", status: "past_due" }) };
    expect(await processHostedSubscriptionLifecycleEvent(input, deps)).toMatchObject({ ok: false });
    expect(runtime.client.table("stripe_events")).toHaveLength(0);
    expect(await processHostedSubscriptionLifecycleEvent(input, deps)).toMatchObject({ ok: true, processed: true });
  });

  it("keeps events before managed subscription provisioning retryable", async () => {
    const runtime = await createSeededRuntime();
    const rows = runtime.client.table("hosted_subscriptions").splice(0);
    const input = { eventId: "evt_early", eventType: "invoice.paid" as const, object: { subscription: "sub_test_123" } };
    const deps = { ...runtime, retrieveSubscription: async () => ({ id: "sub_test_123", status: "active", metadata: { tap_rater: "hosted_multilink" } }) };
    expect(await processHostedSubscriptionLifecycleEvent(input, deps)).toMatchObject({ ok: false });
    expect(runtime.client.table("stripe_events")).toHaveLength(0);
    runtime.client.table("hosted_subscriptions").push(...rows);
    expect(await processHostedSubscriptionLifecycleEvent(input, deps)).toMatchObject({ ok: true, processed: true });
  });

  it("ignores unrelated subscriptions without claiming a processed receipt", async () => {
    const runtime = await createSeededRuntime();
    const result = await processHostedSubscriptionLifecycleEvent({ eventId: "evt_other", eventType: "invoice.paid", object: { subscription: "sub_other" } },
      { ...runtime, retrieveSubscription: async () => ({ id: "sub_other", status: "active" }), isManagedSubscription: async () => false });
    expect(result).toMatchObject({ ok: true, processed: false, reason: "not_hosted_subscription" });
    expect(runtime.client.table("stripe_events")).toHaveLength(0);
  });

  it("uses current Stripe state instead of reviving a cancelled subscription from an old paid invoice", async () => {
    const runtime = await createSeededRuntime();
    const result = await processHostedSubscriptionLifecycleEvent({ eventId: "evt_old_paid", eventType: "invoice.paid", object: { subscription: "sub_test_123" } },
      { ...runtime, retrieveSubscription: async () => ({ id: "sub_test_123", status: "canceled" }) });
    expect(result).toMatchObject({ lifecycleStatus: "EXPIRED" });
    expect(runtime.client.table("hosted_subscriptions")[0].status).toBe("canceled");
  });

  it("preserves current scheduled cancellation and reads item-level paid-through dates", async () => {
    const runtime = await createSeededRuntime();
    await processHostedSubscriptionLifecycleEvent({ eventId: "evt_paid_cancel", eventType: "invoice.paid", object: { subscription: "sub_test_123" } },
      { ...runtime, retrieveSubscription: async () => ({ id: "sub_test_123", status: "active", cancel_at_period_end: true, items: { data: [{ current_period_end: 1_800_000_000 }] } }) });
    expect(runtime.client.table("hosted_subscriptions")[0]).toMatchObject({ lifecycle_status: "CANCELLED_AT_PERIOD_END", cancel_at_period_end: true, current_period_end: "2027-01-15T08:00:00.000Z" });
  });

  it("does not extend the grace period on repeated failure notifications", async () => {
    const runtime = await createSeededRuntime({ status: "past_due", past_due_since: "2026-08-24T12:00:00.000Z" });
    await processHostedSubscriptionLifecycleEvent({ eventId: "evt_still_past_due", eventType: "invoice.payment_failed", object: { subscription: "sub_test_123" }, now: new Date("2026-08-29T12:00:00Z") },
      { ...runtime, retrieveSubscription: async () => ({ id: "sub_test_123", status: "past_due" }) });
    expect(runtime.client.table("hosted_subscriptions")[0]).toMatchObject({ past_due_since: "2026-08-24T12:00:00.000Z", grace_ends_at: "2026-08-31T12:00:00.000Z" });
  });

  it("does not trust legacy prematurely recorded event IDs", async () => {
    const runtime = await createSeededRuntime();
    runtime.client.table("stripe_events").push({ id: "evt_legacy" });
    expect(await processHostedSubscriptionLifecycleEvent({ eventId: "evt_legacy", eventType: "invoice.paid", object: { subscription: "sub_test_123" } },
      { ...runtime, retrieveSubscription: async () => ({ id: "sub_test_123", status: "active" }) })).toMatchObject({ ok: true, processed: true });
  });

  it("serializes different events for the same subscription", async () => {
    const runtime = await createSeededRuntime();
    let release!: () => void;
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const deps = { ...runtime, retrieveSubscription: vi.fn(async () => { started(); await held; return { id: "sub_test_123", status: "active" }; }) };
    const input = { eventId: "evt_concurrent_a", eventType: "invoice.paid" as const, object: { subscription: "sub_test_123" } };
    const first = processHostedSubscriptionLifecycleEvent(input, deps);
    await entered;
    expect(await processHostedSubscriptionLifecycleEvent({ ...input, eventId: "evt_concurrent_b" }, deps)).toMatchObject({ ok: false });
    release();
    expect(await first).toMatchObject({ ok: true });
    expect(await processHostedSubscriptionLifecycleEvent({ ...input, eventId: "evt_concurrent_b" }, deps)).toMatchObject({ ok: true });
  });
});

async function createSeededRuntime(overrides: Record<string, unknown> = {}) {
  const client = new MemoryDbClient(overrides);
  const storage = new MemoryHostedStorage();
  await assignPermanentHostedPageCode(storage, { physicalProductRef: "order-1:item-1", code });
  await publishHostedPageSnapshot(storage, sampleSnapshot());
  return { client, storage };
}

function sampleSnapshot(overrides: Partial<HostedPageSnapshot> = {}): HostedPageSnapshot {
  return {
    schemaVersion: 1,
    code,
    version: "v1",
    publishedAt: "2026-08-23T00:00:00.000Z",
    lifecycleStatus: "ACTIVE",
    businessName: "Lifecycle Cafe",
    headline: "Choose your next step",
    description: "Public hosted page",
    buttons: [{ id: "review", label: "Review us", type: "review", url: "https://example.com/review" }],
    appearance: { accentColor: "#0f766e" },
    ...overrides
  };
}

class MemoryHostedStorage implements HostedPageTextStorage {
  readonly objects = new Map<string, string>();

  async getText(key: string) {
    return this.objects.get(key) ?? null;
  }

  async putText(key: string, value: string, _options?: HostedPagePutOptions) {
    this.objects.set(key, value);
  }

  async putTextIfAbsent(key: string, value: string, _options?: HostedPagePutOptions) {
    if (this.objects.has(key)) return false;
    this.objects.set(key, value);
    return true;
  }
}

class MemoryDbClient extends PaymentMemoryDb implements OrdersDbClient {
  constructor(overrides: Record<string, unknown> = {}) {
    super({
      hosted_subscriptions: [
        {
          id: "hosted-subscription-1",
          customer_id: "customer-1",
          business_id: "business-1",
          hosted_page_id: "hosted-page-1",
          stripe_checkout_session_id: "cs_test_123",
          stripe_customer_id: "cus_test_123",
          stripe_subscription_id: "sub_test_123",
          permanent_code: code,
          hosted_page_url: `https://taprater.com/p/${code}`,
          status: "active",
          lifecycle_status: "ACTIVE",
          current_period_end: "2027-01-15T08:00:00.000Z",
          cancel_at_period_end: false,
          past_due_since: null,
          grace_ends_at: null,
          provisioning_status: "ready_for_customer_setup",
          ...overrides
        }
      ],
      hosted_page_editor_pages: [
        {
          id: "hosted-page-1",
          customer_id: "customer-1",
          business_id: "business-1",
          code,
          lifecycle_status: "ACTIVE",
          draft_json: {},
          published_version: "v1"
        }
      ],
      stripe_events: []
    });
  }
}
