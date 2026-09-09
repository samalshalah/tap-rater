import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/commerce-recovery", () => ({ runCommerceRecovery: async (event: any, siteUrl: string) => (await import("@/lib/stripe-commerce-processing")).processStripeCommerceEvent(event, siteUrl) }));
vi.mock("@/lib/billing-invoices", () => ({ recordBillingInvoiceFromCheckoutSession: vi.fn().mockResolvedValue({ ok: true }), recordBillingInvoiceFromStripeInvoice: vi.fn().mockResolvedValue({ ok: true }) }));

vi.mock("@/lib/order-refunds", () => ({ processStripeRefundEvent: vi.fn() }));
vi.mock("@/lib/stripe-processing", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/stripe-processing")>(),
  withStripePaymentLock: vi.fn(async (_key, work) => work(async () => {})),
}));

function createSignedWebhookRequest() {
  return new Request("https://taprater.test/api/webhooks/stripe", {
    method: "POST",
    body: "{}",
    headers: {
      "stripe-signature": "test-signature",
    },
  });
}

describe("Stripe webhook paid order emails", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("fails the webhook so a paid order email exception remains retryable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({
        ok: true,
        mode: "test",
        secretKey: "sk_test_unit",
        publishableKey: "pk_test_unit",
        webhookSecret: "whsec_unit",
      }),
      getStripeClient: () => ({
        webhooks: {
          constructEvent: () => ({
            type: "checkout.session.completed",
            data: {
              object: {
                id: "cs_test_email",
                payment_status: "paid",
              },
            },
          }),
        },
      }),
    }));
    vi.doMock("@/lib/orders", () => ({
      savePaidOrderFromCheckoutSession: vi.fn().mockResolvedValue({
        ok: true,
        wasAlreadyPaid: false,
        order: {
          stripe_checkout_session_id: "cs_test_email",
          status: "paid",
          payment_status: "paid",
          email: "buyer@example.com",
          subtotal_cents: 3900,
          total_cents: 3900,
          currency: "usd",
          line_items_json: [],
        },
      }),
      ensurePaidOrderProductionArtwork: vi.fn().mockResolvedValue({ ok: true, order: { stripe_checkout_session_id: "cs_test_email", line_items_json: [] } }),
    }));
    vi.doMock("@/lib/hosted-subscription-provisioning", () => ({
      provisionHostedSubscriptionFromCheckout: vi
        .fn()
        .mockResolvedValue({ ok: true, provisioned: false }),
      provisionPaidCustomerAccountFromOrder: vi.fn().mockResolvedValue({ ok: true, accountProvisioned: false }),
    }));
    vi.doMock("@/lib/order-emails", () => ({
      sendPaidOrderEmails: vi
        .fn()
        .mockRejectedValue(new Error("Resend unavailable")),
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(createSignedWebhookRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Order email recovery failed." });
    expect(warn).toHaveBeenCalledWith(
      "[stripe-webhook] paid_order_email_failed",
      expect.objectContaining({
        stripeCheckoutSessionId: "cs_test_email",
        errorName: "Error",
      }),
    );
  });

  it("reconciles paid order emails even when the order was already paid", async () => {
    const sendPaidOrderEmails = vi.fn().mockResolvedValue({ customer: { sent: true }, admin: { sent: true } });
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({
        ok: true,
        mode: "test",
        secretKey: "sk_test_unit",
        publishableKey: "pk_test_unit",
        webhookSecret: "whsec_unit",
      }),
      getStripeClient: () => ({
        webhooks: {
          constructEvent: () => ({
            type: "checkout.session.completed",
            data: {
              object: {
                id: "cs_test_duplicate",
                payment_status: "paid",
              },
            },
          }),
        },
      }),
    }));
    vi.doMock("@/lib/orders", () => ({
      savePaidOrderFromCheckoutSession: vi.fn().mockResolvedValue({
        ok: true,
        wasAlreadyPaid: true,
        order: {
          stripe_checkout_session_id: "cs_test_duplicate",
          status: "paid",
          payment_status: "paid",
          subtotal_cents: 3900,
          total_cents: 3900,
          currency: "usd",
          line_items_json: [],
        },
      }),
      ensurePaidOrderProductionArtwork: vi.fn().mockResolvedValue({ ok: true, order: { stripe_checkout_session_id: "cs_test_duplicate", line_items_json: [] } }),
    }));
    vi.doMock("@/lib/hosted-subscription-provisioning", () => ({
      provisionHostedSubscriptionFromCheckout: vi
        .fn()
        .mockResolvedValue({ ok: true, provisioned: false }),
      provisionPaidCustomerAccountFromOrder: vi.fn().mockResolvedValue({ ok: true, accountProvisioned: false }),
    }));
    vi.doMock("@/lib/order-emails", () => ({
      sendPaidOrderEmails,
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(createSignedWebhookRequest());

    expect(response.status).toBe(200);
    expect(sendPaidOrderEmails).toHaveBeenCalledOnce();
  });

  it("provisions a requested direct customer account after first paid checkout", async () => {
    const provisionPaidCustomerAccountFromOrder = vi.fn().mockResolvedValue({ ok: true, accountProvisioned: true });
    const order = {
      stripe_checkout_session_id: "cs_test_direct_account",
      status: "paid",
      payment_status: "paid",
      email: "buyer@example.com",
      subtotal_cents: 3900,
      total_cents: 3900,
      currency: "usd",
      line_items_json: [],
      customer_details_json: { create_account: true },
    };
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({
        ok: true,
        mode: "test",
        secretKey: "sk_test_unit",
        publishableKey: "pk_test_unit",
        webhookSecret: "whsec_unit",
      }),
      getStripeClient: () => ({
        webhooks: {
          constructEvent: () => ({
            type: "checkout.session.completed",
            data: {
              object: {
                id: "cs_test_direct_account",
                payment_status: "paid",
              },
            },
          }),
        },
      }),
    }));
    vi.doMock("@/lib/orders", () => ({
      savePaidOrderFromCheckoutSession: vi.fn().mockResolvedValue({
        ok: true,
        wasAlreadyPaid: false,
        order,
      }),
      ensurePaidOrderProductionArtwork: vi.fn().mockResolvedValue({ ok: true, order }),
    }));
    vi.doMock("@/lib/hosted-subscription-provisioning", () => ({
      provisionHostedSubscriptionFromCheckout: vi.fn().mockResolvedValue({ ok: true, provisioned: false }),
      provisionPaidCustomerAccountFromOrder,
    }));
    vi.doMock("@/lib/order-emails", () => ({
      sendPaidOrderEmails: vi.fn().mockResolvedValue({ customer: { sent: true }, admin: { sent: true } }),
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(createSignedWebhookRequest());

    expect(response.status).toBe(200);
    expect(provisionPaidCustomerAccountFromOrder).toHaveBeenCalledWith({
      order,
      siteUrl: "https://taprater.test"
    });
  });
});
