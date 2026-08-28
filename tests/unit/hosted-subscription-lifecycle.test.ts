import { describe, expect, it } from "vitest";
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
      { client, storage }
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
      { client, storage }
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
        object: { subscription: "sub_test_123" },
        now
      },
      { client, storage }
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
        object: { subscription: "sub_test_123" },
        now: new Date("2026-08-25T12:00:00.000Z")
      },
      { client, storage }
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
      { client, storage }
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
      { client, storage }
    );
    const second = await processHostedSubscriptionLifecycleEvent(
      {
        eventId: "evt_duplicate_lifecycle",
        eventType: "invoice.paid",
        object: { subscription: "sub_test_123" },
        now: new Date("2026-08-25T12:00:00.000Z")
      },
      { client, storage }
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

class MemoryDbClient implements OrdersDbClient {
  private readonly rows: Record<string, Record<string, any>[]>;

  constructor(overrides: Record<string, unknown> = {}) {
    this.rows = {
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
    };
  }

  table(name: string) {
    return this.rows[name] ?? [];
  }

  from(table: string) {
    return new MemoryQueryBuilder(this.rows, table);
  }
}

class MemoryQueryBuilder {
  private filters: Array<{ column: string; value: unknown }> = [];
  private action: "select" | "insert" | "upsert" | "update" = "select";
  private values: Record<string, any> = {};
  private selected = false;

  constructor(
    private readonly rows: Record<string, Record<string, any>[]>,
    private readonly table: string
  ) {}

  select(_columns = "*") {
    this.selected = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  insert(values: Record<string, any>) {
    this.action = "insert";
    this.values = values;
    return this;
  }

  update(values: Record<string, any>) {
    this.action = "update";
    this.values = values;
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  async maybeSingle() {
    const result = await this.execute();
    return { data: result.data?.[0] ?? null, error: result.error };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    const tableRows = (this.rows[this.table] ??= []);

    if (this.action === "insert") {
      const row = { id: `${this.table}-${tableRows.length + 1}`, ...this.values };
      tableRows.push(row);
      return { data: this.selected ? [row] : null, error: null };
    }

    if (this.action === "update") {
      const matches = tableRows.filter((row) => this.filters.every((filter) => row[filter.column] === filter.value));
      matches.forEach((row) => Object.assign(row, this.values));
      return { data: this.selected ? matches : null, error: null };
    }

    const matches = tableRows.filter((row) => this.filters.every((filter) => row[filter.column] === filter.value));
    return { data: matches, error: null };
  }
}
