import { afterEach, describe, expect, it, vi } from "vitest";

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
});
