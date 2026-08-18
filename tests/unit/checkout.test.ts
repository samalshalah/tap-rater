import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import {
  buildStripeCheckoutLineItems,
  createCheckoutSessionParams,
  getStripeMode,
  getStripeClient,
  isStripeLivePublishableKey,
  isStripeLiveSecretKey,
  isStripeTestPublishableKey,
  isStripeTestSecretKey,
  validateCheckoutCart,
  validateStripeRuntimeConfig,
  validateStripeWebhookConfig,
  withTimeout
} from "@/lib/checkout";

const configuredStandardItem = {
  productId: "google-review-stand",
  optionId: "standard_direct" as const,
  quantity: 1,
  setup: {
    destinationUrl: "https://g.page/example/review"
  }
};

describe("Stripe checkout helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STRIPE_MODE;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("validates cart items server-side against active in-stock products", () => {
    const result = validateCheckoutCart(
      [
        { ...configuredStandardItem, quantity: 2 },
        { productId: "old-product", quantity: 5 },
        { productId: "stale-platform-product", quantity: 1 }
      ],
      migratedProducts
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      productId: "google-review-stand",
      optionId: "standard_direct",
      optionLabel: "Standard Direct Stand",
      manualProductionRequired: false,
      productionWarningCodes: [],
      quantity: 2,
      unitAmountCents: 3900,
      lineSubtotalCents: 7800
    });
    expect(result.totalCents).toBe(7800);
  });

  it("rejects empty or invalid checkout carts", () => {
    expect(validateCheckoutCart([], migratedProducts)).toMatchObject({ ok: false, reason: "empty_cart" });
    expect(validateCheckoutCart([{ productId: "old-product", quantity: 1 }], migratedProducts)).toMatchObject({
      ok: false,
      reason: "empty_cart"
    });
  });

  it("allows only buy-now products in the current one-time checkout", () => {
    expect(validateCheckoutCart([{ productId: "stale-platform-product", quantity: 1 }], migratedProducts)).toMatchObject({
      ok: false,
      reason: "empty_cart"
    });
  });

  it("allows branded checkout only with uploaded logo, generated QR, and proof approval", () => {
    expect(
      validateCheckoutCart(
        [
          {
            productId: "google-review-stand",
            optionId: "branded_qr_direct",
            quantity: 1,
            setup: {
              destinationUrl: "https://g.page/example/review",
              businessName: "Nova Implant",
              logoFileName: "fake-local-logo.png"
            }
          }
        ],
        migratedProducts
      )
    ).toMatchObject({ ok: false, reason: "empty_cart" });

    const result = validateCheckoutCart(
      [
        {
          productId: "google-review-stand",
          optionId: "branded_qr_direct",
          quantity: 1,
          setup: {
            destinationUrl: "https://g.page/example/review",
            businessName: "Nova Implant",
            logoFileName: "fake-local-logo.png",
            logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
            logoStorageKey: "products/customer-setup-google-review-stand/center_asset/logo.png",
            generatedQrValue: "https://g.page/example/review",
            frontTemplateUrl: "/api/media/product/products/google-review-stand/branded_front_template/template.png",
            proofPreviewData: {
              businessName: "Nova Implant",
              qrValue: "https://g.page/example/review"
            },
            proofApproved: true
          }
        }
      ],
      migratedProducts
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      optionId: "branded_qr_direct",
      logoRequired: true,
      logoStatus: "uploaded",
      logoReference: "products/customer-setup-google-review-stand/center_asset/logo.png",
      proofRequired: true,
      proofApproved: true,
      productionStatus: "pending_branded_proof_review",
      manualProductionRequired: true,
      productionWarningCodes: [
        "pending_manual_proof",
        "do_not_print_until_manual_review"
      ]
    });
    expect(result.rows[0].setup).toMatchObject({
      logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
      generatedQrValue: "https://g.page/example/review",
      proofApproved: true
    });
  });

  it("does not accept Hosted Multi-Link in the current one-time checkout", () => {
    const result = validateCheckoutCart(
      [
        {
          productId: "custom-direct-stand",
          optionId: "hosted_multilink",
          quantity: 1,
          setup: {
            businessName: "Nova Implant",
            manualCollectionAcknowledged: true
          }
        }
      ],
      migratedProducts
    );

    expect(result).toMatchObject({ ok: false, reason: "empty_cart" });
  });

  it("classifies Stripe key prefixes without exposing key values", () => {
    expect(isStripeTestSecretKey("sk_test_123")).toBe(true);
    expect(isStripeTestSecretKey("sk_live_123")).toBe(false);
    expect(isStripeLiveSecretKey("sk_live_123")).toBe(true);
    expect(isStripeLiveSecretKey("sk_test_123")).toBe(false);
    expect(isStripeTestPublishableKey("pk_test_123")).toBe(true);
    expect(isStripeTestPublishableKey("pk_live_123")).toBe(false);
    expect(isStripeLivePublishableKey("pk_live_123")).toBe(true);
    expect(isStripeLivePublishableKey("pk_test_123")).toBe(false);
    expect(isStripeTestSecretKey("")).toBe(false);
  });

  it("defaults Stripe mode to test when STRIPE_MODE is missing", () => {
    expect(getStripeMode()).toBe("test");
  });

  it("accepts matching Stripe test keys in test mode", () => {
    process.env.STRIPE_MODE = "test";
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";

    expect(validateStripeRuntimeConfig()).toMatchObject({
      ok: true,
      mode: "test"
    });
  });

  it("rejects live keys in Stripe test mode", () => {
    process.env.STRIPE_MODE = "test";
    process.env.STRIPE_SECRET_KEY = "sk_live_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_unit";

    expect(validateStripeRuntimeConfig()).toMatchObject({
      ok: false,
      mode: "test",
      error: "Stripe test mode is not configured. Use sk_test_ and pk_test_ keys only."
    });
  });

  it("accepts matching Stripe live keys and webhook secret in live mode", () => {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_live_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_unit";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live_unit";

    expect(validateStripeRuntimeConfig()).toMatchObject({
      ok: true,
      mode: "live"
    });
  });

  it("rejects test keys in Stripe live mode", () => {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live_unit";

    expect(validateStripeRuntimeConfig()).toMatchObject({
      ok: false,
      mode: "live",
      error: "Stripe live mode is not configured. Use sk_live_ and pk_live_ keys only."
    });
  });

  it("requires a webhook secret for live Stripe mode", () => {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_live_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_unit";

    expect(validateStripeRuntimeConfig()).toMatchObject({
      ok: false,
      mode: "live",
      error: "Stripe live webhook is not configured."
    });
    expect(validateStripeWebhookConfig()).toMatchObject({
      ok: false,
      mode: "live",
      error: "Stripe live webhook is not configured."
    });
  });

  it("constructs Stripe with the fetch HTTP client for Cloudflare Workers", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
    const fetchClientSpy = vi.spyOn(Stripe, "createFetchHttpClient");

    const client = getStripeClient();

    expect(client).toBeInstanceOf(Stripe);
    expect(fetchClientSpy).toHaveBeenCalledOnce();
  });

  it("fails fast when a checkout dependency times out", async () => {
    await expect(withTimeout(new Promise(() => undefined), 1, "Stripe Checkout Session creation")).rejects.toMatchObject({
      label: "Stripe Checkout Session creation",
      name: "CheckoutTimeoutError",
      timeoutMs: 1
    });
  });

  it("returns a completed dependency result before the timeout", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 50, "fast dependency")).resolves.toBe("ok");
  });

  it("builds Stripe line items from validated cart rows", () => {
    const result = validateCheckoutCart([configuredStandardItem], migratedProducts);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(buildStripeCheckoutLineItems(result.rows)).toEqual([
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: {
            name: "Google Review Stand",
            description: "Standard Direct Stand - Countertop NFC stand that opens your Google review link with one tap or scan.",
            metadata: {
              product_id: "google-review-stand",
              option_id: "standard_direct",
              sku: "TR-GOOGLE-STAND"
            }
          },
          unit_amount: 3900
        }
      }
    ]);
  });

  it("creates Checkout Session params with dynamic price_data and mode metadata", () => {
    const result = validateCheckoutCart([configuredStandardItem], migratedProducts);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const params = createCheckoutSessionParams({
      cart: result,
      siteUrl: "https://taprater.com"
    });

    expect(params.mode).toBe("payment");
    expect(params.success_url).toBe("https://taprater.com/checkout/success?session_id={CHECKOUT_SESSION_ID}");
    expect(params.cancel_url).toBe("https://taprater.com/checkout/cancel");
    expect(params.payment_method_types).toEqual(["card"]);
    expect(params.line_items?.[0]).toMatchObject({
      price_data: {
        currency: "usd",
        unit_amount: 3900,
        product_data: {
          name: "Google Review Stand"
        }
      }
    });
    expect(params.metadata?.stripe_mode).toBe("test");
    expect(params.metadata?.total_cents).toBe("3900");
    expect(params.metadata?.configured_items).toBe("1");
    expect(params.metadata).not.toHaveProperty("order_items");
  });

  it("records live mode metadata when live checkout is enabled", () => {
    const result = validateCheckoutCart([configuredStandardItem], migratedProducts);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const params = createCheckoutSessionParams({
      cart: result,
      siteUrl: "https://taprater.com",
      stripeMode: "live"
    });

    expect(params.metadata?.stripe_mode).toBe("live");
  });
});
