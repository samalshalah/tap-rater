import { describe, expect, it } from "vitest";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";
import { recordBillingInvoiceFromCheckoutSessionWithClient, recordBillingInvoiceFromStripeInvoiceWithClient } from "@/lib/billing-invoices";
import type { OrderRecord } from "@/lib/orders";
const order = { id: "order1", email: "qa@example.com", stripe_checkout_session_id: "cs_test_invoice", subtotal_cents: 4900, total_cents: 6300,
  shipping_amount_cents: 1200, payment_status: "paid", currency: "usd", line_items_json: [{ productId: "stand", sku: "QA", title: "Branded stand", quantity: 2, lineSubtotalCents: 4900 }] } as OrderRecord;
const session = { id: order.stripe_checkout_session_id, invoice: { id: "in_qa", invoice_pdf: "https://example.com/invoice.pdf" } };
describe("billing invoice recovery", () => {
  it.each(["hosted_subscriptions", "customers"])("fails closed on %s lookup errors", async table => {
    const client = new PaymentMemoryDb();
    client.failures.push({ table, action: "select", message: "offline" });
    await expect(recordBillingInvoiceFromCheckoutSessionWithClient(client, order, session)).rejects.toThrow();
    expect(client.table("billing_invoices")).toHaveLength(0);
  });
  it("retries a line-item failure without duplicating invoices or items", async () => {
    const client = new PaymentMemoryDb();
    client.failures.push({ table: "billing_invoice_items", action: "upsert", message: "offline" });
    expect(await recordBillingInvoiceFromCheckoutSessionWithClient(client, order, session)).toMatchObject({ ok: false });
    expect(await recordBillingInvoiceFromCheckoutSessionWithClient(client, order, session)).toMatchObject({ ok: true });
    expect(await recordBillingInvoiceFromCheckoutSessionWithClient(client, order, session)).toMatchObject({ ok: true });
    expect(client.table("billing_invoices")).toHaveLength(1);
    expect(client.table("billing_invoice_items")).toHaveLength(1);
  });
  it("does not acknowledge a lost invoice identity lookup", async () => {
    const client = new PaymentMemoryDb();
    client.failures.push({ table: "billing_invoices", action: "select", message: "offline" });
    await expect(recordBillingInvoiceFromCheckoutSessionWithClient(client, order, session)).rejects.toThrow("Invoice identity lookup failed");
  });
  it("does not overwrite the initial subscription checkout items with renewal placeholders", async () => {
    const client = new PaymentMemoryDb({ customers: [{ id: "customer1", email: order.email }], hosted_subscriptions: [{ id: "hosted1", order_id: order.id, customer_id: "customer1", stripe_subscription_id: "sub_qa" }] });
    await recordBillingInvoiceFromCheckoutSessionWithClient(client, order, session);
    await recordBillingInvoiceFromStripeInvoiceWithClient(client, { id: "in_qa", status: "paid", total: 6300, customer_email: order.email, parent: { subscription_details: { subscription: "sub_qa" } } });
    expect(client.table("billing_invoice_items")).toHaveLength(1);
    expect(client.table("billing_invoice_items")[0]).toMatchObject({ title: "Branded stand", quantity: 2, amount_cents: 4900 });
  });
});
