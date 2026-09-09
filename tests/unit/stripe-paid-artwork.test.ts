import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ save: vi.fn(), artwork: vi.fn(), provision: vi.fn(), account: vi.fn(), emails: vi.fn(), invoice: vi.fn(), guard: vi.fn() }));
vi.mock("@/lib/checkout", () => ({ getStripeClient: () => ({}) }));
vi.mock("@/lib/orders", () => ({ savePaidOrderFromCheckoutSession: mocks.save, ensurePaidOrderProductionArtwork: mocks.artwork, markCheckoutOrderPaymentFailure: vi.fn() }));
vi.mock("@/lib/stripe-processing", () => ({ withStripePaymentLock: async (_key: string, work: any) => work(mocks.guard) }));
vi.mock("@/lib/hosted-subscription-provisioning", () => ({ provisionHostedSubscriptionFromCheckout: mocks.provision, provisionPaidCustomerAccountFromOrder: mocks.account }));
vi.mock("@/lib/order-emails", () => ({ sendPaidOrderEmails: mocks.emails }));
vi.mock("@/lib/billing-invoices", () => ({ recordBillingInvoiceFromCheckoutSession: mocks.invoice, recordBillingInvoiceFromStripeInvoice: vi.fn() }));
vi.mock("@/lib/order-refunds", () => ({ processStripeRefundEvent: vi.fn() }));
vi.mock("@/lib/hosted-subscription-lifecycle", () => ({ processHostedSubscriptionLifecycleEvent: vi.fn() }));
import { processStripeCommerceEvent } from "@/lib/stripe-commerce-processing";

const originalOrder = { id: "order-test", stripe_checkout_session_id: "cs_test", line_items_json: [] };
const finalOrder = { ...originalOrder, line_items_json: [{ setup: { productionArtwork: { status: "generated", storageKey: "private.svg" } } }] };
function event(type = "checkout.session.completed", paymentStatus = "paid") {
  return { id: "evt_test", type, data: { object: { id: "cs_test", payment_status: paymentStatus } } } as unknown as Stripe.Event;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockResolvedValue({ ok: true, order: originalOrder });
  mocks.provision.mockResolvedValue({ ok: true, provisioned: true });
  mocks.artwork.mockResolvedValue({ ok: true, order: finalOrder });
  mocks.invoice.mockResolvedValue({ ok: true });
  mocks.account.mockResolvedValue({ ok: true });
  mocks.emails.mockResolvedValue({ customer: { sent: true }, admin: { sent: true } });
});

describe("paid webhook artwork orchestration", () => {
  it.each(["checkout.session.completed", "checkout.session.async_payment_succeeded"])("generates after provisioning and emails the attached order for %s", async type => {
    expect((await processStripeCommerceEvent(event(type), "https://taprater.test")).status).toBe(200);
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.provision.mock.invocationCallOrder[0]);
    expect(mocks.provision.mock.invocationCallOrder[0]).toBeLessThan(mocks.artwork.mock.invocationCallOrder[0]);
    expect(mocks.artwork).toHaveBeenCalledWith("cs_test", { assertActive: mocks.guard });
    expect(mocks.emails).toHaveBeenCalledWith(finalOrder);
    expect(mocks.invoice).toHaveBeenCalledWith(finalOrder, expect.anything());
  });

  it("does not complete on artwork failure and retries even when already paid", async () => {
    mocks.artwork.mockResolvedValueOnce({ ok: false, error: "R2 unavailable" });
    expect((await processStripeCommerceEvent(event(), "https://taprater.test")).status).toBe(500);
    expect(mocks.emails).not.toHaveBeenCalled();
    mocks.save.mockResolvedValue({ ok: true, wasAlreadyPaid: true, order: originalOrder });
    expect((await processStripeCommerceEvent(event(), "https://taprater.test")).status).toBe(200);
    expect(mocks.artwork).toHaveBeenCalledTimes(2);
    expect(mocks.emails).toHaveBeenCalledOnce();
  });

  it("skips all provisioning and artwork for reversed payments", async () => {
    mocks.save.mockResolvedValue({ ok: true, paymentReversed: true, order: originalOrder });
    expect((await processStripeCommerceEvent(event(), "https://taprater.test")).status).toBe(200);
    expect(mocks.provision).not.toHaveBeenCalled();
    expect(mocks.artwork).not.toHaveBeenCalled();
    expect(mocks.emails).not.toHaveBeenCalled();
  });

  it("does not generate on unpaid completion", async () => {
    expect((await processStripeCommerceEvent(event("checkout.session.completed", "unpaid"), "https://taprater.test")).status).toBe(200);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.artwork).not.toHaveBeenCalled();
  });

  it("waits for provisioning recovery before attempting artwork", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.provision.mockResolvedValue({ ok: false, error: "Provisioning unavailable" });
    expect((await processStripeCommerceEvent(event(), "https://taprater.test")).status).toBe(500);
    expect(mocks.artwork).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not send purchase emails if the reloaded order is refunded", async () => {
    mocks.artwork.mockResolvedValue({ ok: true, paymentReversed: true, order: originalOrder });
    expect((await processStripeCommerceEvent(event(), "https://taprater.test")).status).toBe(200);
    expect(mocks.emails).not.toHaveBeenCalled();
  });
});
