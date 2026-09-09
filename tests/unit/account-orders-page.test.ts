import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountOrdersPage from "@/app/account/orders/page";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal, type CustomerPortalData } from "@/lib/customer-portal";

vi.mock("@/lib/customer-auth", () => ({ requireCustomer: vi.fn() }));
vi.mock("@/lib/customer-portal", () => ({ getCustomerPortal: vi.fn() }));

let portal: CustomerPortalData;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireCustomer).mockResolvedValue({ email: "billing@example.test", issuedAt: 1788887520000 });
  portal = {
    configured: true,
    customer: { id: "qa-customer", email: "billing@example.test" },
    businesses: [], devices: [], stands: [], subscriptions: [],
    orders: [{
      id: "qa-order", reference: "cs_test_history_only", status: "paid", paymentStatus: "paid",
      paymentMethodLabel: "Visa ending 4242", productionStatus: "not_started", shippingStatus: "not_shipped",
      subtotalCents: 3900, shippingAmountCents: 1200, totalCents: 5334, currency: "usd", itemCount: 1, items: []
    }],
    invoices: [{
      id: "qa-invoice", orderId: "qa-order", invoiceNumber: "QA-0001", status: "paid", paymentStatus: "paid",
      paymentMethodLabel: "Visa ending 4242", invoiceUrl: "https://example.test/invoice.pdf",
      invoicePdfUrl: "https://example.test/invoice.pdf", hostedInvoiceUrl: "https://example.test/invoice",
      receiptUrl: "https://example.test/receipt", subtotalCents: 3900, taxCents: 234,
      shippingCents: 1200, totalCents: 5334, amountPaidCents: 5334, currency: "usd", issuedAt: "2026-09-08T12:00:00Z"
    }]
  };
  vi.mocked(getCustomerPortal).mockImplementation(async () => portal);
});

describe("account invoices and billing", () => {
  it("shows invoices without a duplicate order-history section", async () => {
    const html = renderToStaticMarkup(await AccountOrdersPage({}));
    expect(requireCustomer).toHaveBeenCalledOnce();
    expect(getCustomerPortal).toHaveBeenCalledWith("billing@example.test");
    expect(html).toContain('id="invoices"');
    expect(html).toContain("Payment documents");
    expect(html).toContain("QA-0001");
    expect(html).not.toContain("Order history");
    expect(html).not.toContain("Invoices and payment history");
    expect(html).not.toContain("cs_test_history_only");
    expect(portal.orders).toHaveLength(1);
  });

  it("preserves invoice amounts, payment details, PDF and receipt links", async () => {
    const html = renderToStaticMarkup(await AccountOrdersPage({}));
    expect(html).toContain("$53.34");
    expect(html).toContain("Visa ending 4242");
    expect(html).toContain('href="https://example.test/invoice.pdf"');
    expect(html).toContain("Download PDF");
    expect(html).toContain('href="https://example.test/receipt"');
    expect(html).toContain("Manage payment method");
  });

  it("preserves subscription-specific billing controls", async () => {
    portal.subscriptions.push({
      id: "qa-subscription", hostedPageUrl: "https://example.test/p/QA", permanentCode: "QA",
      status: "active", lifecycleStatus: "ACTIVE", cancelAtPeriodEnd: false,
      billingProfileAvailable: true, currentPeriodEnd: "2026-10-08T12:00:00Z"
    });
    const html = renderToStaticMarkup(await AccountOrdersPage({}));
    expect(html).toContain("Multi-Link subscriptions");
    expect(html).toContain('action="/api/account/billing-portal"');
    expect(html).toContain('name="subscription_id" value="qa-subscription"');
    expect(html).toContain("Manage billing");
    expect(html).not.toContain("Manage payment method");
  });

  it("shows an unpaid renewal as due and exposes the hosted payment recovery link", async () => {
    Object.assign(portal.invoices[0], { status: "open", paymentStatus: "open", totalCents: 999, amountPaidCents: 0, receiptUrl: undefined });
    const html = renderToStaticMarkup(await AccountOrdersPage({}));
    expect(html).toContain("Amount due");
    expect(html).toContain("$9.99");
    expect(html).toContain("Paid $0.00");
    expect(html).toContain(">open</span>");
    expect(html).toContain('href="https://example.test/invoice"');
    expect(html).toContain("Complete payment");
    expect(html).toContain("Download PDF");
    expect(html).not.toContain(">Receipt</a>");
  });

  it("subtracts partial payments from the open invoice balance", async () => {
    Object.assign(portal.invoices[0], { status: "open", paymentStatus: "open", totalCents: 999, amountPaidCents: 400 });
    const html = renderToStaticMarkup(await AccountOrdersPage({}));
    expect(html).toContain("$5.99");
    expect(html).toContain("Paid $4.00");
    expect(html).toContain("Complete payment");
  });

  it.each(["paid", "void", "uncollectible", "draft"])("does not request payment for a %s invoice or replace zero paid with its total", async (status) => {
    Object.assign(portal.invoices[0], { status, paymentStatus: status, amountPaidCents: 0 });
    const html = renderToStaticMarkup(await AccountOrdersPage({}));
    expect(html).toContain("$0.00");
    expect(html).not.toContain("$53.34");
    expect(html).not.toContain("Complete payment");
    expect(html).toContain("View invoice");
    expect(html).toContain(`>${status}</span>`);
  });

  it("does not label a hosted-only invoice link as a PDF", async () => {
    portal.invoices[0].invoicePdfUrl = undefined;
    portal.invoices[0].invoiceUrl = "https://example.test/invoice";
    const html = renderToStaticMarkup(await AccountOrdersPage({}));
    expect(html).toContain("View invoice");
    expect(html).not.toContain("Download PDF");
  });

  it("preserves unknown legacy document links without claiming they are PDFs", async () => {
    portal.invoices[0].invoicePdfUrl = undefined;
    portal.invoices[0].hostedInvoiceUrl = undefined;
    const html = renderToStaticMarkup(await AccountOrdersPage({}));
    expect(html).toContain('href="https://example.test/invoice.pdf"');
    expect(html).toContain("View invoice");
    expect(html).not.toContain("Download PDF");
  });

  it("keeps payment-review and billing errors even without order history", async () => {
    portal.orders[0].paymentStatus = "manual_unpaid";
    const html = renderToStaticMarkup(await AccountOrdersPage({
      searchParams: Promise.resolve({ billing_error: "Billing is temporarily unavailable." })
    }));
    expect(html).toContain("Some payments are waiting for Tap Rater review.");
    expect(html).toContain("Billing is temporarily unavailable.");
    expect(html).not.toContain("Order history");
  });

  it("retains invoice and subscription empty states without an order list", async () => {
    portal.invoices = [];
    const html = renderToStaticMarkup(await AccountOrdersPage({}));
    expect(html).toContain("Invoices will appear here after Stripe confirms payment.");
    expect(html).toContain("No recurring Multi-Link billing is connected to this account.");
    expect(html).not.toContain("No submitted orders");
    expect(html).not.toContain("cs_test_history_only");
  });
});
