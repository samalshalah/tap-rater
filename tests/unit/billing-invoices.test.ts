import { describe, expect, it } from "vitest";
import { recordBillingInvoiceFromStripeInvoiceWithClient } from "@/lib/billing-invoices";
import type { OrdersDbClient } from "@/lib/orders";

describe("billing invoice storage", () => {
  it("stores subscription invoices by resolving the customer through Stripe subscription ID", async () => {
    const client = new MemoryDbClient({
      customers: [{ id: "customer-1", email: "owner@example.com" }],
      hosted_subscriptions: [
        {
          id: "hosted-sub-1",
          customer_id: "customer-1",
          order_id: "order-1",
          stripe_subscription_id: "sub_123",
          stripe_customer_id: "cus_123"
        }
      ],
      orders: [],
      billing_invoices: [],
      billing_invoice_items: []
    });

    const result = await recordBillingInvoiceFromStripeInvoiceWithClient(client, {
      id: "in_123",
      number: "INV-123",
      status: "paid",
      paid: true,
      customer: "cus_123",
      subscription: "sub_123",
      total: 999,
      amount_paid: 999,
      currency: "usd",
      hosted_invoice_url: "https://pay.stripe.com/invoice",
      invoice_pdf: "https://pay.stripe.com/invoice.pdf",
      created: 1_800_000_000
    });

    expect(result).toMatchObject({ ok: true, skipped: false });
    expect(client.table("billing_invoices")).toMatchObject([
      {
        customer_id: "customer-1",
        order_id: "order-1",
        hosted_subscription_id: "hosted-sub-1",
        email: "owner@example.com",
        stripe_invoice_id: "in_123",
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
        invoice_number: "INV-123",
        payment_status: "paid",
        total_cents: 999,
        amount_paid_cents: 999,
        invoice_pdf_url: "https://pay.stripe.com/invoice.pdf"
      }
    ]);
    expect(client.table("billing_invoice_items")).toMatchObject([
      {
        billing_invoice_id: "billing_invoices-1",
        hosted_subscription_id: "hosted-sub-1",
        order_id: "order-1",
        title: "Hosted Multi-Link page",
        option_label: "Monthly hosting"
      }
    ]);
  });

  it("stores all hosted subscription invoice items when one Stripe invoice covers multiple Multi-Link pages", async () => {
    const client = new MemoryDbClient({
      customers: [{ id: "customer-1", email: "owner@example.com" }],
      hosted_subscriptions: [
        {
          id: "hosted-sub-1",
          customer_id: "customer-1",
          order_id: "order-1",
          stripe_subscription_id: "sub_shared",
          stripe_customer_id: "cus_123",
          hosted_page_url: "https://taprater.com/p/AAA"
        },
        {
          id: "hosted-sub-2",
          customer_id: "customer-1",
          order_id: "order-1",
          stripe_subscription_id: "sub_shared",
          stripe_customer_id: "cus_123",
          hosted_page_url: "https://taprater.com/p/BBB"
        }
      ],
      orders: [],
      billing_invoices: [],
      billing_invoice_items: []
    });

    const result = await recordBillingInvoiceFromStripeInvoiceWithClient(client, {
      id: "in_shared",
      status: "paid",
      paid: true,
      customer: "cus_123",
      subscription: "sub_shared",
      total: 1998,
      amount_paid: 1998,
      currency: "usd"
    });

    expect(result).toMatchObject({ ok: true, skipped: false });
    expect(client.table("billing_invoice_items")).toMatchObject([
      {
        billing_invoice_id: "billing_invoices-1",
        hosted_subscription_id: "hosted-sub-1",
        hosted_page_url: "https://taprater.com/p/AAA"
      },
      {
        billing_invoice_id: "billing_invoices-1",
        hosted_subscription_id: "hosted-sub-2",
        hosted_page_url: "https://taprater.com/p/BBB"
      }
    ]);
  });
});

class MemoryDbClient implements OrdersDbClient {
  constructor(private readonly rows: Record<string, Record<string, any>[]>) {}

  table(name: string) {
    return this.rows[name] ?? [];
  }

  from(table: string) {
    return new MemoryQueryBuilder(this.rows, table);
  }
}

class MemoryQueryBuilder {
  private filters: Array<{ column: string; value: unknown }> = [];
  private action: "select" | "upsert" = "select";
  private values: Record<string, any> = {};
  private conflictTarget?: string;
  private limitCount?: number;

  constructor(
    private readonly rows: Record<string, Record<string, any>[]>,
    private readonly table: string
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order() {
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  upsert(values: Record<string, any>, options?: { onConflict?: string }) {
    this.action = "upsert";
    this.values = values;
    this.conflictTarget = options?.onConflict;
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

  private async execute(): Promise<{ data: Record<string, any>[] | null; error: null }> {
    const tableRows = (this.rows[this.table] ??= []);
    if (this.action === "upsert") {
      const conflictColumns = this.conflictTarget?.split(",").map((column) => column.trim()).filter(Boolean) ?? [];
      const existing = conflictColumns.length
        ? tableRows.find((row) => conflictColumns.every((column) => row[column] === this.values[column]))
        : undefined;
      if (existing) {
        Object.assign(existing, this.values);
        return { data: [existing], error: null };
      }
      const row = { id: `${this.table}-${tableRows.length + 1}`, ...this.values };
      tableRows.push(row);
      return { data: [row], error: null };
    }

    const matches = tableRows.filter((row) => this.filters.every((filter) => row[filter.column] === filter.value));
    if (this.limitCount !== undefined) return { data: matches.slice(0, this.limitCount), error: null };
    return { data: matches, error: null };
  }
}
