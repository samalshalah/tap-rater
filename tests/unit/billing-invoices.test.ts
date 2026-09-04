import { describe, expect, it } from "vitest";
import {
  recordBillingInvoiceFromCheckoutSessionWithClient,
  recordBillingInvoiceFromStripeInvoiceWithClient
} from "@/lib/billing-invoices";
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

  it("preserves checkout links and amount breakdown when invoice.paid is replayed", async () => {
    const client = new MemoryDbClient({
      customers: [{ id: "customer-1", email: "buyer@example.com" }],
      hosted_subscriptions: [],
      orders: [],
      billing_invoices: [],
      billing_invoice_items: []
    });
    const order = {
      id: "order-1",
      stripe_checkout_session_id: "cs_test_123",
      stripe_payment_intent_id: "pi_123",
      status: "paid",
      payment_status: "paid",
      email: "buyer@example.com",
      customer_name: "Buyer",
      subtotal_cents: 3900,
      shipping_amount_cents: 1200,
      total_cents: 5334,
      currency: "usd",
      line_items_json: [
        {
          productId: "google-review-stand",
          title: "Google Review Stand",
          sku: "TR-GOOGLE-REV-ST-STD",
          quantity: 1,
          unitAmountCents: 3900,
          lineSubtotalCents: 3900
        }
      ],
      customer_details_json: {
        stripe_customer_id: "cus_123",
        receipt_url: "https://pay.stripe.com/receipt",
        tax_summary: { amount_cents: 234 },
        payment_method_details: { type: "card", brand: "visa", last4: "4242" }
      }
    } as any;

    const checkoutResult = await recordBillingInvoiceFromCheckoutSessionWithClient(client, order, {
      id: "cs_test_123",
      customer: "cus_123",
      invoice: {
        id: "in_123",
        number: "INV-123",
        hosted_invoice_url: "https://pay.stripe.com/invoice/initial"
      }
    } as any);
    expect(checkoutResult).toMatchObject({ ok: true, skipped: false });

    const webhookResult = await recordBillingInvoiceFromStripeInvoiceWithClient(client, {
      id: "in_123",
      number: "INV-123",
      status: "paid",
      customer: "cus_123",
      subtotal: 5334,
      total: 5334,
      amount_paid: 5334,
      currency: "usd",
      hosted_invoice_url: "https://pay.stripe.com/invoice/final"
    });

    expect(webhookResult).toMatchObject({ ok: true, skipped: false });
    expect(client.table("billing_invoices")).toMatchObject([
      {
        order_id: "order-1",
        customer_id: "customer-1",
        stripe_checkout_session_id: "cs_test_123",
        stripe_payment_intent_id: "pi_123",
        payment_method_label: "Visa ending 4242",
        subtotal_cents: 3900,
        tax_cents: 234,
        shipping_cents: 1200,
        total_cents: 5334,
        hosted_invoice_url: "https://pay.stripe.com/invoice/final"
      }
    ]);
    expect(client.table("billing_invoice_items")).toMatchObject([
      {
        order_id: "order-1",
        title: "Google Review Stand",
        quantity: 1,
        amount_cents: 3900
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
