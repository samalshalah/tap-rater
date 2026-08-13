import { afterEach, describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { handleCheckoutPost, type CheckoutRouteDependencies } from "@/lib/checkout-route";

const configuredStandardPayload = {
  items: [
    {
      productId: "google-review-stand",
      optionId: "standard_direct",
      quantity: 1,
      setup: {
        destinationUrl: "https://g.page/example/review",
        proofApproved: true
      }
    }
  ]
};

function createCheckoutRequest(payload: unknown) {
  return new Request("https://taprater.test/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function createDependencies(overrides: Partial<CheckoutRouteDependencies> = {}) {
  return {
    createPendingOrder: vi.fn().mockResolvedValue({ ok: true }),
    createRequestId: () => "checkout_test_request",
    createStripeSession: vi.fn().mockResolvedValue({ id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" }),
    getProducts: vi.fn().mockResolvedValue(migratedProducts),
    getSiteUrl: () => "https://taprater.test",
    hasOrderPersistence: () => true,
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn()
    },
    orderTimeoutMs: 50,
    stripeTimeoutMs: 50,
    ...overrides
  };
}

describe("checkout route reliability", () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("returns invalid carts quickly before creating a Stripe session", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    const dependencies = createDependencies();

    const response = await handleCheckoutPost(
      createCheckoutRequest({
        items: [
          {
            productId: "missing-product",
            optionId: "standard_direct",
            quantity: 1,
            setup: {
              destinationUrl: "https://example.com",
              proofApproved: true
            }
          }
        ]
      }),
      dependencies
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ reason: "empty_cart" });
    expect(dependencies.createStripeSession).not.toHaveBeenCalled();
    expect(dependencies.createPendingOrder).not.toHaveBeenCalled();
  });

  it("returns a clean timeout response and does not create an order when Stripe hangs", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    const createPendingOrder = vi.fn().mockResolvedValue({ ok: true });
    const dependencies = createDependencies({
      createPendingOrder,
      createStripeSession: vi.fn(() => new Promise<never>(() => undefined)),
      stripeTimeoutMs: 1
    });

    const response = await handleCheckoutPost(createCheckoutRequest(configuredStandardPayload), dependencies);
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body).toEqual({ error: "Stripe Checkout timed out. Please try again." });
    expect(createPendingOrder).not.toHaveBeenCalled();
  });

  it("does not create an order when Stripe session creation fails", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    const createPendingOrder = vi.fn().mockResolvedValue({ ok: true });
    const dependencies = createDependencies({
      createPendingOrder,
      createStripeSession: vi.fn().mockRejectedValue(new Error("Stripe network failure"))
    });

    const response = await handleCheckoutPost(createCheckoutRequest(configuredStandardPayload), dependencies);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Stripe Checkout could not be started." });
    expect(createPendingOrder).not.toHaveBeenCalled();
  });

  it("creates a pending order only after Stripe returns a checkout session", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    const dependencies = createDependencies();

    const response = await handleCheckoutPost(createCheckoutRequest(configuredStandardPayload), dependencies);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_123" });
    expect(dependencies.createStripeSession).toHaveBeenCalledOnce();
    expect(dependencies.createPendingOrder).toHaveBeenCalledOnce();
  });
});
