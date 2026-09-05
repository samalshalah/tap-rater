import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/commerce-recovery", () => ({ runCommerceRecovery: async (event: any, siteUrl: string) => (await import("@/lib/stripe-commerce-processing")).processStripeCommerceEvent(event, siteUrl) }));
vi.mock("@/lib/billing-invoices", () => ({ recordBillingInvoiceFromCheckoutSession: vi.fn().mockResolvedValue({ ok: true }), recordBillingInvoiceFromStripeInvoice: vi.fn().mockResolvedValue({ ok: true }) }));

vi.mock("@/lib/order-refunds", () => ({ processStripeRefundEvent: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("@/lib/stripe-processing", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/stripe-processing")>(),
  withStripePaymentLock: vi.fn(async (_key, work) => work(async () => {})),
}));

function createWebhookRequest() {
  return new Request("https://taprater.test/api/webhooks/stripe", {
    method: "POST",
    body: "{}"
  });
}

describe("Stripe webhook route configuration", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete process.env.STRIPE_MODE;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("requires a test webhook secret in default test mode", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(createWebhookRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Stripe test webhook is not configured." });
  }, 10_000);

  it("rejects test keys in live webhook mode", async () => {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live_unit";

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(createWebhookRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Stripe live mode is not configured. Use sk_live_ and pk_live_ keys only." });
  });

  it("accepts live webhook configuration before requiring a Stripe signature", async () => {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_live_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_unit";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live_unit";

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(createWebhookRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Stripe signature is missing." });
  });

  it("rejects an invalid Stripe signature", async () => {
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({
        ok: true,
        mode: "test",
        secretKey: "sk_test_unit",
        publishableKey: "pk_test_unit",
        webhookSecret: "whsec_unit"
      }),
      getStripeClient: () => ({
        webhooks: {
          constructEvent: () => {
            throw new Error("bad signature");
          }
        }
      })
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("https://taprater.test/api/webhooks/stripe", {
        method: "POST",
        body: "{\"id\":\"evt_bad\"}",
        headers: { "stripe-signature": "invalid" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Stripe webhook signature verification failed." });
  });

  it("reports signed webhook processing failures separately from signature failures", async () => {
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({
        ok: true,
        mode: "test",
        secretKey: "sk_test_unit",
        publishableKey: "pk_test_unit",
        webhookSecret: "whsec_unit"
      }),
      getStripeClient: () => ({
        webhooks: {
          constructEvent: () => ({
            id: "evt_subscription_updated",
            type: "customer.subscription.updated",
            data: { object: { id: "sub_test_123", status: "active" } }
          })
        }
      })
    }));
    vi.doMock("@/lib/hosted-subscription-lifecycle", () => ({
      processHostedSubscriptionLifecycleEvent: vi.fn().mockRejectedValue(new Error("database unavailable"))
    }));
    vi.doMock("@/lib/orders", () => ({
      savePaidOrderFromCheckoutSession: vi.fn()
    }));
    vi.doMock("@/lib/hosted-subscription-provisioning", () => ({
      provisionHostedSubscriptionFromCheckout: vi.fn(),
      provisionPaidCustomerAccountFromOrder: vi.fn()
    }));
    vi.doMock("@/lib/order-emails", () => ({
      sendPaidOrderEmails: vi.fn()
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("https://taprater.test/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "test-signature" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Stripe webhook processing failed." });
  });

  it("dispatches signed subscription lifecycle events without creating checkout resources", async () => {
    const lifecycle = vi.fn().mockResolvedValue({ ok: true, processed: true });
    const savePaidOrder = vi.fn();
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({
        ok: true,
        mode: "test",
        secretKey: "sk_test_unit",
        publishableKey: "pk_test_unit",
        webhookSecret: "whsec_unit"
      }),
      getStripeClient: () => ({
        webhooks: {
          constructEvent: () => ({
            id: "evt_subscription_updated",
            type: "customer.subscription.updated",
            data: { object: { id: "sub_test_123", status: "active" } }
          })
        }
      })
    }));
    vi.doMock("@/lib/hosted-subscription-lifecycle", () => ({
      processHostedSubscriptionLifecycleEvent: lifecycle
    }));
    vi.doMock("@/lib/orders", () => ({
      savePaidOrderFromCheckoutSession: savePaidOrder
    }));
    vi.doMock("@/lib/hosted-subscription-provisioning", () => ({
      provisionHostedSubscriptionFromCheckout: vi.fn(),
      provisionPaidCustomerAccountFromOrder: vi.fn()
    }));
    vi.doMock("@/lib/order-emails", () => ({
      sendPaidOrderEmails: vi.fn()
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("https://taprater.test/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "test-signature" }
      })
    );

    expect(response.status).toBe(200);
    expect(lifecycle).toHaveBeenCalledWith({
      eventId: "evt_subscription_updated",
      eventType: "customer.subscription.updated",
      object: { id: "sub_test_123", status: "active" }
    });
    expect(savePaidOrder).not.toHaveBeenCalled();
  });

  it.each([
    ["checkout.session.async_payment_failed", "failed", "failed"],
    ["checkout.session.expired", "canceled", "expired"]
  ] as const)("records %s against the pending order", async (eventType, orderStatus, paymentStatus) => {
    const markPaymentFailure = vi.fn().mockResolvedValue({ ok: true });
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({
        ok: true,
        mode: "test",
        secretKey: "sk_test_unit",
        publishableKey: "pk_test_unit",
        webhookSecret: "whsec_unit"
      }),
      getStripeClient: () => ({
        webhooks: {
          constructEvent: () => ({
            id: `evt_${paymentStatus}`,
            type: eventType,
            data: { object: { id: "cs_test_failure" } }
          })
        }
      })
    }));
    vi.doMock("@/lib/orders", () => ({
      markCheckoutOrderPaymentFailure: markPaymentFailure,
      savePaidOrderFromCheckoutSession: vi.fn()
    }));
    vi.doMock("@/lib/hosted-subscription-lifecycle", () => ({
      processHostedSubscriptionLifecycleEvent: vi.fn()
    }));
    vi.doMock("@/lib/hosted-subscription-provisioning", () => ({
      provisionHostedSubscriptionFromCheckout: vi.fn(),
      provisionPaidCustomerAccountFromOrder: vi.fn()
    }));
    vi.doMock("@/lib/order-emails", () => ({
      sendPaidOrderEmails: vi.fn()
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("https://taprater.test/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "test-signature" }
      })
    );

    expect(response.status).toBe(200);
    expect(markPaymentFailure).toHaveBeenCalledWith("cs_test_failure", orderStatus, paymentStatus);
  });

  it.each(["refund.created", "refund.updated", "refund.failed", "charge.refunded"])("dispatches signed %s events", async (type) => {
    const { processStripeRefundEvent } = await import("@/lib/order-refunds");
    vi.mocked(processStripeRefundEvent).mockResolvedValue({ ok: true });
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({ ok: true, webhookSecret: "whsec_unit" }),
      getStripeClient: () => ({ webhooks: { constructEvent: () => ({ id: "evt_refund", type, data: { object: { id: type === "charge.refunded" ? "ch_test" : "re_test", payment_intent: "pi_test" } } }) } }),
    }));
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(new Request("https://taprater.test/api/webhooks/stripe", { method: "POST", body: "{}", headers: { "stripe-signature": "signed" } }));
    expect(response.status).toBe(200);
    expect(processStripeRefundEvent).toHaveBeenCalledWith({ paymentIntentId: "pi_test", ...(type === "charge.refunded" ? {} : { refundId: "re_test" }) });
  });

  it("returns a retryable error when refund synchronization fails", async () => {
    const { processStripeRefundEvent } = await import("@/lib/order-refunds");
    vi.mocked(processStripeRefundEvent).mockResolvedValue({ ok: false, error: "Database unavailable" });
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({ ok: true, webhookSecret: "whsec_unit" }),
      getStripeClient: () => ({ webhooks: { constructEvent: () => ({ id: "evt_refund", type: "refund.updated", data: { object: { id: "re_test", payment_intent: "pi_test" } } }) } }),
    }));
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    expect((await POST(new Request("https://taprater.test/api/webhooks/stripe", { method: "POST", body: "{}", headers: { "stripe-signature": "signed" } }))).status).toBe(500);
  });

  it.each([true, false])("verifies real SDK refund signatures (valid=%s)", async (valid) => {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe("sk_test_unit");
    const payload = JSON.stringify({ id: "evt_signed_refund", type: "refund.updated", data: { object: { id: "re_signed", payment_intent: "pi_signed" } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: valid ? "whsec_unit" : "whsec_wrong" });
    const { processStripeRefundEvent } = await import("@/lib/order-refunds");
    vi.mocked(processStripeRefundEvent).mockClear().mockResolvedValue({ ok: true });
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({ ok: true, webhookSecret: "whsec_unit" }),
      getStripeClient: () => stripe,
    }));
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(new Request("https://taprater.test/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": signature } }));
    expect(response.status).toBe(valid ? 200 : 400);
    expect(processStripeRefundEvent).toHaveBeenCalledTimes(valid ? 1 : 0);
  });

  it.each([1, 0, 2])("resolves a subscription checkout's payment reference only when unambiguous (%s references)", async (count) => {
    const list = vi.fn().mockResolvedValue({ data: Array.from({ length: count }, (_, index) => ({ payment: { payment_intent: `pi_invoice_${index}` } })), has_more: false });
    const save = vi.fn().mockResolvedValue({ ok: true, paymentReversed: true, wasAlreadyPaid: true, order: {} });
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({ ok: true, webhookSecret: "whsec_unit" }),
      getStripeClient: () => ({
        invoicePayments: { list },
        webhooks: { constructEvent: () => ({ id: "evt_invoice_checkout", type: "checkout.session.completed", data: { object: { id: "cs_test_invoice", payment_status: "paid", subscription: "sub_test", invoice: "in_test" } } }) },
      }),
    }));
    vi.doMock("@/lib/orders", () => ({ savePaidOrderFromCheckoutSession: save }));
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(new Request("https://taprater.test/api/webhooks/stripe", { method: "POST", body: "{}", headers: { "stripe-signature": "signed" } }));
    expect(list).toHaveBeenCalledWith({ invoice: "in_test", status: "paid", limit: 100 });
    expect(response.status).toBe(count === 1 ? 200 : 500);
    if (count === 1) expect(save).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_invoice_0" }));
    else expect(save).not.toHaveBeenCalled();
  });

  it("does not provision or send purchase emails for replayed refunded orders", async () => {
    vi.doMock("@/lib/checkout", () => ({
      validateStripeWebhookConfig: () => ({ ok: true, webhookSecret: "whsec_unit" }),
      getStripeClient: () => ({ webhooks: { constructEvent: () => ({ id: "evt_replay", type: "checkout.session.completed", data: { object: { id: "cs_test", payment_status: "paid" } } }) } }),
    }));
    vi.doMock("@/lib/orders", () => ({ savePaidOrderFromCheckoutSession: vi.fn().mockResolvedValue({ ok: true, paymentReversed: true, wasAlreadyPaid: true, order: { payment_status: "refunded" } }) }));
    const provision = vi.fn();
    const emails = vi.fn();
    vi.doMock("@/lib/hosted-subscription-provisioning", () => ({ provisionHostedSubscriptionFromCheckout: provision, provisionPaidCustomerAccountFromOrder: vi.fn() }));
    vi.doMock("@/lib/order-emails", () => ({ sendPaidOrderEmails: emails }));
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    expect((await POST(new Request("https://taprater.test/api/webhooks/stripe", { method: "POST", body: "{}", headers: { "stripe-signature": "signed" } }))).status).toBe(200);
    expect(provision).not.toHaveBeenCalled();
    expect(emails).not.toHaveBeenCalled();
  });
});
