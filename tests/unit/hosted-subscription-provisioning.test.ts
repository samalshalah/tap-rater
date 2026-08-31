import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  isHostedSubscriptionCheckout,
  mapStripeSubscriptionLifecycle,
  provisionHostedSubscriptionFromCheckout
} from "@/lib/hosted-subscription-provisioning";
import type { HostedPagePutOptions, HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import type { OrderRecord, OrdersDbClient } from "@/lib/orders";

describe("hosted subscription provisioning", () => {
  it("does not treat ordinary DIRECT paid orders as hosted provisioning work", async () => {
    const order = createHostedOrder({ lineItems: [{ productId: "google-review-stand", optionId: "standard_direct", title: "Google", sku: "G", quantity: 1, unitAmountCents: 3900, lineSubtotalCents: 3900 }] });

    expect(isHostedSubscriptionCheckout({ id: "cs_test_direct" }, order)).toBe(false);
  });

  it("provisions customer ownership, permanent code, hosted page URL, subscription, production targets, and setup email after paid checkout", async () => {
    const client = new MemoryDbClient();
    const storage = new MemoryHostedStorage(["ABCDEFGHJKM2"]);
    const order = createHostedOrder();
    const sendHostedSetupEmailFn = vi.fn().mockResolvedValue({ sent: true });

    const result = await provisionHostedSubscriptionFromCheckout(
      {
        eventId: "evt_test_hosted_paid",
        eventType: "checkout.session.completed",
        session: {
          id: "cs_test_hosted",
          mode: "subscription",
          payment_status: "paid",
          customer: "cus_test_123",
          subscription: {
            id: "sub_test_123",
            status: "active",
            current_period_end: 1_800_000_000
          },
          customer_details: {
            email: "Owner@Example.com",
            name: "Owner Example"
          },
          metadata: {
            checkout_intent: "hosted_subscription"
          }
        },
        order,
        now: new Date("2026-08-23T12:00:00.000Z"),
        siteUrl: "https://taprater.com"
      },
      { client, storage, generateCode: () => "ABCDEFGHJKM2", sendHostedSetupEmailFn }
    );

    expect(result).toEqual({
      ok: true,
      provisioned: true,
      code: "ABCDEFGHJKM2",
      hostedPageUrl: "https://taprater.com/p/ABCDEFGHJKM2"
    });
    expect(client.table("customers")).toMatchObject([
      {
        email: "owner@example.com",
        account_status: "pending_activation",
        activation_expires_at: "2026-08-30T12:00:00.000Z"
      }
    ]);
    expect(client.table("customers")[0].activation_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(client.table("hosted_page_editor_pages")).toMatchObject([{ code: "ABCDEFGHJKM2", lifecycle_status: "ACTIVE" }]);
    expect(client.table("hosted_subscriptions")).toMatchObject([
      {
        stripe_checkout_session_id: "cs_test_hosted",
        stripe_subscription_id: "sub_test_123",
        permanent_code: "ABCDEFGHJKM2",
        hosted_page_url: "https://taprater.com/p/ABCDEFGHJKM2",
        provisioning_status: "ready_for_customer_setup"
      }
    ]);
    expect(client.table("orders")[0].line_items_json[0].setup).toMatchObject({
      permanentPageCode: "ABCDEFGHJKM2",
      hostedPageCode: "ABCDEFGHJKM2",
      generatedQrValue: "https://taprater.com/p/ABCDEFGHJKM2",
      qrTargetUrl: "https://taprater.com/p/ABCDEFGHJKM2",
      nfcTargetUrl: "https://taprater.com/p/ABCDEFGHJKM2"
    });
    expect(storage.objects.has("hosted-pages/ABCDEFGHJKM2/current.json")).toBe(true);
    expect(sendHostedSetupEmailFn).toHaveBeenCalledWith({
      to: "owner@example.com",
      businessName: "Owner Example",
      hostedPageUrl: "https://taprater.com/p/ABCDEFGHJKM2",
      activationToken: expect.any(String)
    });
  });

  it("does not roll back hosted provisioning when setup email fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const client = new MemoryDbClient();
    const storage = new MemoryHostedStorage(["ABCDEFGHJKM2"]);

    const result = await provisionHostedSubscriptionFromCheckout(
      {
        eventId: "evt_test_hosted_email_failure",
        session: {
          id: "cs_test_hosted",
          payment_status: "paid",
          customer_details: { email: "owner@example.com" },
          metadata: { checkout_intent: "hosted_subscription" },
          subscription: { id: "sub_test_123", status: "active" }
        },
        order: createHostedOrder(),
        now: new Date("2026-08-23T12:00:00.000Z"),
        siteUrl: "https://taprater.com"
      },
      {
        client,
        storage,
        generateCode: () => "ABCDEFGHJKM2",
        sendHostedSetupEmailFn: vi.fn().mockResolvedValue({ sent: false, reason: "missing_api_key" })
      }
    );

    expect(result).toMatchObject({ ok: true, provisioned: true, code: "ABCDEFGHJKM2" });
    expect(client.table("hosted_subscriptions")).toHaveLength(1);
    expect(storage.objects.has("hosted-pages/ABCDEFGHJKM2/current.json")).toBe(true);
    expect(warn).toHaveBeenCalledWith("[hosted-provisioning] setup_email_not_sent", expect.objectContaining({ reason: "missing_api_key" }));
  });

  it("does not consume a second code for duplicate Stripe events", async () => {
    const client = new MemoryDbClient();
    const storage = new MemoryHostedStorage(["ABCDEFGHJKM2", "BBBBBBBBBBB2"]);
    const input = {
      eventId: "evt_duplicate",
      eventType: "checkout.session.completed",
      session: {
        id: "cs_test_hosted",
        payment_status: "paid",
        customer_details: { email: "owner@example.com" },
        metadata: { checkout_intent: "hosted_subscription" },
        subscription: { id: "sub_test_duplicate", status: "active" }
      },
      order: createHostedOrder(),
      now: new Date("2026-08-23T12:00:00.000Z"),
      siteUrl: "https://taprater.com"
    };

    await provisionHostedSubscriptionFromCheckout(input, { client, storage, generateCode: () => "ABCDEFGHJKM2" });
    const duplicate = await provisionHostedSubscriptionFromCheckout(input, { client, storage, generateCode: () => "BBBBBBBBBBB2" });

    expect(duplicate).toEqual({ ok: true, provisioned: false, reason: "duplicate_event" });
    expect(storage.assignedCodes).toEqual(["ABCDEFGHJKM2"]);
  });

  it("does not allocate permanent resources for an unpaid hosted checkout session", async () => {
    const client = new MemoryDbClient();
    const storage = new MemoryHostedStorage(["ABCDEFGHJKM2"]);
    const result = await provisionHostedSubscriptionFromCheckout(
      {
        eventId: "evt_unpaid",
        eventType: "checkout.session.completed",
        session: {
          id: "cs_test_unpaid",
          payment_status: "unpaid",
          customer_details: { email: "owner@example.com" },
          metadata: { checkout_intent: "hosted_subscription" },
          subscription: { id: "sub_test_unpaid", status: "incomplete" }
        },
        order: createHostedOrder(),
        now: new Date("2026-08-23T12:00:00.000Z"),
        siteUrl: "https://taprater.com"
      },
      { client, storage, generateCode: () => "ABCDEFGHJKM2" }
    );

    expect(result).toEqual({ ok: true, provisioned: false, reason: "unpaid_checkout" });
    expect(client.table("hosted_subscriptions")).toHaveLength(0);
    expect(client.table("hosted_page_editor_pages")).toHaveLength(0);
    expect(storage.assignedCodes).toEqual([]);
  });

  it("reactivates an expired customer using the existing hosted page and permanent code", async () => {
    const client = new MemoryDbClient();
    client.table("customers").push({ id: "customers-1", email: "owner@example.com", name: "Owner Example", account_status: "active" });
    client.table("businesses").push({ id: "businesses-1", customer_id: "customers-1", business_name: "Owner Example" });
    client.table("hosted_page_editor_pages").push({
      id: "hosted_page_editor_pages-1",
      customer_id: "customers-1",
      business_id: "businesses-1",
      code: "ABCDEFGHJKM2",
      lifecycle_status: "EXPIRED",
      draft_json: {
        businessName: "Owner Example",
        appearance: { theme: "light", accentColor: "#0f766e" },
        buttons: []
      }
    });
    client.table("hosted_subscriptions").push({
      id: "hosted_subscriptions-1",
      customer_id: "customers-1",
      business_id: "businesses-1",
      hosted_page_id: "hosted_page_editor_pages-1",
      order_id: "old-order",
      stripe_checkout_session_id: "cs_test_old",
      stripe_customer_id: "cus_test_old",
      stripe_subscription_id: "sub_test_old",
      permanent_code: "ABCDEFGHJKM2",
      hosted_page_url: "https://taprater.com/p/ABCDEFGHJKM2",
      status: "canceled",
      lifecycle_status: "EXPIRED"
    });
    const storage = new MemoryHostedStorage(["BBBBBBBBBBB2"]);
    storage.objects.set(
      "hosted-pages/ABCDEFGHJKM2/assignment.json",
      JSON.stringify({ code: "ABCDEFGHJKM2", physicalProductRef: "old-order:item-1", assignedAt: "2026-08-01T00:00:00.000Z" })
    );

    const result = await provisionHostedSubscriptionFromCheckout(
      {
        eventId: "evt_reactivated",
        eventType: "checkout.session.completed",
        session: {
          id: "cs_test_new",
          payment_status: "paid",
          customer: "cus_test_new",
          customer_details: { email: "owner@example.com", name: "Owner Example" },
          metadata: { checkout_intent: "hosted_subscription" },
          subscription: { id: "sub_test_new", status: "active" }
        },
        order: { ...createHostedOrder(), id: "new-order", stripe_checkout_session_id: "cs_test_new" },
        now: new Date("2026-08-23T12:00:00.000Z"),
        siteUrl: "https://taprater.com"
      },
      { client, storage, generateCode: () => "BBBBBBBBBBB2" }
    );

    expect(result).toMatchObject({ ok: true, provisioned: true, code: "ABCDEFGHJKM2" });
    expect(client.table("customers")).toHaveLength(1);
    expect(client.table("customers")[0].account_status).toBe("active");
    expect(client.table("customers")[0].activation_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(client.table("businesses")).toHaveLength(1);
    expect(client.table("hosted_page_editor_pages")).toHaveLength(1);
    expect(client.table("hosted_subscriptions")).toHaveLength(1);
    expect(client.table("hosted_subscriptions")[0]).toMatchObject({
      stripe_checkout_session_id: "cs_test_new",
      stripe_subscription_id: "sub_test_new",
      permanent_code: "ABCDEFGHJKM2",
      lifecycle_status: "ACTIVE"
    });
    expect(storage.assignedCodes).toEqual([]);
  });

  it("does not send hosted setup email from the browser success page", async () => {
    const source = await readFile("src/app/checkout/success/page.tsx", "utf8");

    expect(source).not.toContain("sendHostedSetupEmail");
    expect(source).not.toContain("provisionHostedSubscriptionFromCheckout");
  });

  it("maps subscription lifecycle states without recycling permanent URLs", () => {
    expect(mapStripeSubscriptionLifecycle({ status: "active" })).toBe("ACTIVE");
    expect(mapStripeSubscriptionLifecycle({ status: "past_due" })).toBe("PAST_DUE");
    expect(mapStripeSubscriptionLifecycle({ status: "active", cancel_at_period_end: true })).toBe("CANCELLED_AT_PERIOD_END");
    expect(mapStripeSubscriptionLifecycle({ status: "canceled" })).toBe("EXPIRED");
  });
});

function createHostedOrder(input: { lineItems?: OrderRecord["line_items_json"] } = {}): OrderRecord {
  return {
    id: "order-1",
    stripe_checkout_session_id: "cs_test_hosted",
    status: "paid",
    payment_status: "paid",
    email: "owner@example.com",
    customer_name: "Owner Example",
    subtotal_cents: 4900,
    total_cents: 4900,
    currency: "usd",
    line_items_json: input.lineItems ?? [
      {
        productId: "hosted-multilink-stand",
        optionId: "hosted_multilink",
        optionLabel: "Hosted Multi-Link Stand",
        destinationMode: "HOSTED",
        customizationLevel: "BRANDED",
        title: "Hosted Multi-Link Stand",
        sku: "TR-HOSTED",
        quantity: 1,
        unitAmountCents: 4900,
        lineSubtotalCents: 4900,
        setup: {
          businessName: "Owner Example"
        }
      }
    ],
    shipping_amount_cents: 0,
    production_status: "not_started",
    shipping_status: "not_shipped",
    internal_notes: "",
    admin_fulfillment_notes: ""
  };
}

class MemoryHostedStorage implements HostedPageTextStorage {
  readonly objects = new Map<string, string>();
  readonly assignedCodes: string[] = [];

  constructor(_codes: string[]) {}

  async getText(key: string) {
    return this.objects.get(key) ?? null;
  }

  async putText(key: string, value: string, _options?: HostedPagePutOptions) {
    this.objects.set(key, value);
  }

  async putTextIfAbsent(key: string, value: string, _options?: HostedPagePutOptions) {
    if (this.objects.has(key)) return false;
    const code = key.match(/^hosted-pages\/([A-HJKMNPQRSTVWXYZ2-9]{12})\/assignment\.json$/)?.[1];
    if (code) this.assignedCodes.push(code);
    this.objects.set(key, value);
    return true;
  }
}

class MemoryDbClient implements OrdersDbClient {
  private readonly rows: Record<string, Record<string, any>[]> = {
    customers: [],
    businesses: [],
    hosted_page_editor_pages: [],
    hosted_subscriptions: [],
    orders: [createHostedOrder() as any],
    stripe_events: []
  };

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
  private conflictTarget?: string;
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

  upsert(values: Record<string, any>, options?: { onConflict?: string }) {
    this.action = "upsert";
    this.values = values;
    this.conflictTarget = options?.onConflict;
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

    if (this.action === "upsert") {
      const target = this.conflictTarget;
      const existing = target ? tableRows.find((row) => row[target] === this.values[target]) : undefined;
      if (existing) {
        Object.assign(existing, this.values);
        return { data: this.selected ? [existing] : null, error: null };
      }
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
