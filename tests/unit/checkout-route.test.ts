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
  ],
  customer: {
    email: "buyer@example.com",
    name: "Buyer Name",
    phone: "555-0100",
    createAccount: false
  },
  shippingAddress: {
    name: "Buyer Name",
    line1: "100 Main St",
    line2: "",
    city: "Washington",
    state: "DC",
    postalCode: "20002",
    country: "US",
    phone: "555-0100"
  }
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
    createStripeSession: vi.fn().mockResolvedValue({ id: "cs_test_123", client_secret: "cs_test_123_secret_unit" }),
    getProducts: vi.fn().mockResolvedValue(migratedProducts),
    getShippingSettings: vi.fn().mockResolvedValue({
      shippingMode: "flat",
      flatShippingAmountCents: 1200,
      allowedCountryCodes: ["US"],
      handlingTimeText: "",
      supportedRegionsText: "United States",
      defaultCarrierNotes: "",
      customerFacingShippingNote: ""
    }),
    getTaxSettings: vi.fn().mockResolvedValue({
      taxMode: "manual",
      manualTaxRateBps: 600,
      taxLabel: "Virginia sales tax",
      taxShipping: false,
      customerFacingTaxNote: "Estimated sales tax is calculated before payment."
    }),
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
    delete process.env.STRIPE_MODE;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("returns invalid payloads quickly before checking Stripe configuration", async () => {
    const dependencies = createDependencies();

    const response = await handleCheckoutPost(createCheckoutRequest({ items: "not-a-cart" }), dependencies);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Customer and shipping details are required before payment." });
    expect(dependencies.createStripeSession).not.toHaveBeenCalled();
    expect(dependencies.createPendingOrder).not.toHaveBeenCalled();
  });

  it("returns invalid carts quickly before creating a Stripe session", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
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
        ],
        customer: configuredStandardPayload.customer,
        shippingAddress: configuredStandardPayload.shippingAddress
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
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
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
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
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

  it("does not create an order when embedded Checkout omits the client secret", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
    const createPendingOrder = vi.fn().mockResolvedValue({ ok: true });
    const dependencies = createDependencies({
      createPendingOrder,
      createStripeSession: vi.fn().mockResolvedValue({ id: "cs_test_123" })
    });

    const response = await handleCheckoutPost(createCheckoutRequest(configuredStandardPayload), dependencies);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Stripe Checkout Session could not be created." });
    expect(createPendingOrder).not.toHaveBeenCalled();
  });

  it("creates a pending order only after Stripe returns an embedded checkout session", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
    const dependencies = createDependencies();

    const response = await handleCheckoutPost(createCheckoutRequest(configuredStandardPayload), dependencies);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      checkoutMode: "embedded",
      clientSecret: "cs_test_123_secret_unit",
      sessionId: "cs_test_123"
    });
    expect(dependencies.createStripeSession).toHaveBeenCalledOnce();
    expect(dependencies.createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeMode: "test",
        shippingSettings: expect.objectContaining({ shippingMode: "flat" }),
        taxSettings: expect.objectContaining({ manualTaxRateBps: 600 })
      })
    );
    expect(dependencies.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCents: 5334,
        shippingAmountCents: 1200,
        shippingMode: "flat",
        taxAmountCents: 234,
        taxSettings: expect.objectContaining({ taxLabel: "Virginia sales tax" })
      })
    );
  });

  it("adds standard shipping under the free-shipping threshold", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
    const dependencies = createDependencies({
      getShippingSettings: vi.fn().mockResolvedValue({
        shippingMode: "flat",
        flatShippingAmountCents: 795,
        allowedCountryCodes: ["US"],
        handlingTimeText: "",
        supportedRegionsText: "United States",
        defaultCarrierNotes: "",
        customerFacingShippingNote: ""
      })
    });

    const response = await handleCheckoutPost(createCheckoutRequest(configuredStandardPayload), dependencies);

    expect(response.status).toBe(200);
    expect(dependencies.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotalCents: 3900,
        totalCents: 4929,
        shippingAmountCents: 795,
        shippingMode: "flat"
      })
    );
  });

  it("records free shipping at or above the threshold", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
    const dependencies = createDependencies();

    const response = await handleCheckoutPost(
      createCheckoutRequest({
        items: [
        {
          ...configuredStandardPayload.items[0],
          quantity: 2
        }
      ],
      customer: configuredStandardPayload.customer,
      shippingAddress: configuredStandardPayload.shippingAddress
    }),
      dependencies
    );

    expect(response.status).toBe(200);
    expect(dependencies.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotalCents: 7800,
        totalCents: 8268,
        shippingAmountCents: 0,
        shippingMode: "free",
        taxAmountCents: 468
      })
    );
  });

  it("rejects mismatched live keys while Stripe mode is test", async () => {
    process.env.STRIPE_MODE = "test";
    process.env.STRIPE_SECRET_KEY = "sk_live_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_unit";
    const dependencies = createDependencies();

    const response = await handleCheckoutPost(createCheckoutRequest(configuredStandardPayload), dependencies);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Stripe test mode is not configured. Use sk_test_ and pk_test_ keys only." });
    expect(dependencies.createStripeSession).not.toHaveBeenCalled();
    expect(dependencies.createPendingOrder).not.toHaveBeenCalled();
  });

  it("allows live mode only with live keys and a webhook secret", async () => {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_live_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_unit";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live_unit";
    const dependencies = createDependencies({
      createStripeSession: vi.fn().mockResolvedValue({ id: "cs_live_123", client_secret: "cs_live_123_secret_unit" })
    });

    const response = await handleCheckoutPost(createCheckoutRequest(configuredStandardPayload), dependencies);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      checkoutMode: "embedded",
      clientSecret: "cs_live_123_secret_unit",
      sessionId: "cs_live_123"
    });
    expect(dependencies.createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeMode: "live",
        shippingSettings: expect.objectContaining({ shippingMode: "flat" }),
        taxSettings: expect.objectContaining({ manualTaxRateBps: 600 })
      })
    );
    expect(dependencies.createPendingOrder).toHaveBeenCalledOnce();
  });

  it("rejects live mode when the webhook secret is missing", async () => {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_live_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_unit";
    const dependencies = createDependencies();

    const response = await handleCheckoutPost(createCheckoutRequest(configuredStandardPayload), dependencies);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Stripe live webhook is not configured." });
    expect(dependencies.createStripeSession).not.toHaveBeenCalled();
    expect(dependencies.createPendingOrder).not.toHaveBeenCalled();
  });
});
