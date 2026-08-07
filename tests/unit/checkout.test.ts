import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import {
  buildStripeCheckoutLineItems,
  createCheckoutSessionParams,
  isStripeTestSecretKey,
  validateCheckoutCart
} from "@/lib/checkout";

const configuredStandardItem = {
  productId: "google-review-stand",
  optionId: "standard_direct" as const,
  quantity: 1,
  setup: {
    destinationUrl: "https://g.page/example/review",
    proofApproved: true
  }
};

describe("Stripe checkout helpers", () => {
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

  it("allows branded checkout only with manual logo collection acknowledged and no fake logo reference", () => {
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
            manualCollectionAcknowledged: true
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
      logoStatus: "manual_collection_required",
      logoReference: null,
      proofRequired: true,
      proofApproved: false,
      productionStatus: "pending_manual_logo_and_proof"
    });
    expect(result.rows[0].setup).not.toHaveProperty("logoFileName");
  });

  it("records custom design notes while keeping custom orders pending manual proof", () => {
    const result = validateCheckoutCart(
      [
        {
          productId: "custom-direct-stand",
          optionId: "custom_direct",
          quantity: 1,
          setup: {
            destinationUrl: "https://example.com",
            businessName: "Nova Implant",
            headline: "Scan to connect",
            cta: "Tap below",
            designNotes: "Use white stand with logo at top.",
            manualCollectionAcknowledged: true
          }
        }
      ],
      migratedProducts
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      optionId: "custom_direct",
      logoRequired: true,
      proofRequired: true,
      proofApproved: false,
      productionStatus: "pending_manual_design_and_proof",
      setup: {
        designNotes: "Use white stand with logo at top."
      }
    });
  });

  it("only accepts Stripe test secret keys", () => {
    expect(isStripeTestSecretKey("sk_test_123")).toBe(true);
    expect(isStripeTestSecretKey("sk_live_123")).toBe(false);
    expect(isStripeTestSecretKey("")).toBe(false);
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

  it("creates test-mode Checkout Session params with success and cancel URLs", () => {
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
    expect(params.metadata?.test_mode_only).toBe("true");
    expect(params.metadata?.total_cents).toBe("3900");
    expect(params.metadata?.configured_items).toBe("1");
    expect(params.metadata).not.toHaveProperty("order_items");
  });
});
