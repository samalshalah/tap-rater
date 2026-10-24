import {createElement, type ReactNode} from "react";
import {InvoiceDetails,SubscriptionDetails} from "@/components/account/customer-orders-manager";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountOrdersPage from "@/app/account/orders/page";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal, type CustomerPortalData } from "@/lib/customer-portal";

vi.mock("@/lib/customer-auth", () => ({ requireCustomer: vi.fn() }));
vi.mock("@/lib/customer-portal", () => ({ getCustomerPortal: vi.fn() }));

vi.mock("@/components/account/account-shell",()=>({AccountShell:({children}:{children:ReactNode})=>children}));
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

describe("compact customer billing",()=>{
 it("keeps each invoice PDF on its matching order row",async()=>{
  portal.orders.push({...portal.orders[0],id:"second-order",reference:"cs_second"});
  portal.invoices.push({...portal.invoices[0],id:"second-invoice",orderId:"second-order",invoiceNumber:"SECOND",invoicePdfUrl:"https://example.test/second.pdf"});
  const html=renderToStaticMarkup(await AccountOrdersPage({}));
  const rows=html.match(/<tr>.*?<\/tr>/g)!;
  expect(rows[1]).toContain("https://example.test/invoice.pdf");
  expect(rows[1]).not.toContain("https://example.test/second.pdf");
  expect(rows[2]).toContain("https://example.test/second.pdf");
  expect(rows[2]).not.toContain('href="https://example.test/invoice.pdf"');
 });

 it("loads only the signed-in customer and links documents on their order row",async()=>{const html=renderToStaticMarkup(await AccountOrdersPage({}));expect(getCustomerPortal).toHaveBeenCalledWith("billing@example.test");expect(html).toContain("View order");expect(html).toContain("View invoice");expect(html).toContain("QA-0001");expect(html).not.toContain("cs_test_history_only");expect(html).toContain("Download PDF");expect(html).toContain("https://example.test/receipt");expect(html).not.toContain("Recurring billing");});
 it("preserves invoice breakdown and documents in the popup content",()=>{const html=renderToStaticMarkup(createElement(InvoiceDetails,{invoice:portal.invoices[0]}));expect(html).toContain("$53.34");expect(html).toContain("Visa ending 4242");expect(html).toContain('href="https://example.test/invoice.pdf"');expect(html).toContain("Download PDF");expect(html).toContain('href="https://example.test/receipt"');});
 it("shows a partial invoice balance accurately",()=>{Object.assign(portal.invoices[0],{status:"open",totalCents:999,amountPaidCents:400});const html=renderToStaticMarkup(createElement(InvoiceDetails,{invoice:portal.invoices[0]}));expect(html).toContain("$5.99");expect(html).toContain("Amount due");expect(html).toContain("Complete payment");});
 it.each(["paid","void","uncollectible","draft"])("never offers payment for %s",status=>{Object.assign(portal.invoices[0],{status,amountPaidCents:0});const html=renderToStaticMarkup(createElement(InvoiceDetails,{invoice:portal.invoices[0]}));expect(html).not.toContain("Complete payment");expect(html).toContain("$0.00");});
 it("keeps subscription-specific billing and cancellation dates",()=>{const html=renderToStaticMarkup(createElement(SubscriptionDetails,{subscription:{id:"owned-subscription",permanentCode:"PAGE1",hostedPageUrl:"https://example.test/p/PAGE1",status:"active",lifecycleStatus:"ACTIVE",cancelAtPeriodEnd:true,billingProfileAvailable:true,currentPeriodEnd:"2026-11-01"}}));expect(html).toContain('name="subscription_id" value="owned-subscription"');expect(html).toContain("Ends");expect(html).not.toContain("Renews");});
 it("keeps billing errors and payment-review status",async()=>{portal.orders[0].paymentStatus="manual_unpaid";const html=renderToStaticMarkup(await AccountOrdersPage({searchParams:Promise.resolve({billing_error:"Billing unavailable"})}));expect(html).toContain("Billing unavailable");expect(html).toContain("Some payments are waiting");});
 it("has simple empty states without empty subscription panels",async()=>{portal.orders=[];portal.invoices=[];const html=renderToStaticMarkup(await AccountOrdersPage({}));expect(html).toContain("No orders yet.");expect(html).not.toContain("Other invoices");expect(html).not.toContain("Subscriptions");});
 it("does not label a generic document as a PDF",()=>{portal.invoices[0].invoicePdfUrl=undefined;portal.invoices[0].hostedInvoiceUrl=undefined;const html=renderToStaticMarkup(createElement(InvoiceDetails,{invoice:portal.invoices[0]}));expect(html).toContain("Open invoice");expect(html).not.toContain("Download PDF");});
});
