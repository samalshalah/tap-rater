import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import {
  buildStripeCheckoutLineItems,
  createCheckoutSessionParams,
  getStripeMode,
  getCheckoutSiteUrl,
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

const productsWithBackendGoogleVariants = migratedProducts.map((product): MigratedProduct => {
  if (product.slug !== "google-review-stand") {
    return product;
  }

  return {
    ...product,
    sizeOptions: [
      {
        code: "regular",
        label: "Standard",
        frontWidthMm: 108,
        frontHeightMm: 165,
        frontWidthIn: 4.25,
        frontHeightIn: 6.5,
        baseDepthMm: 50,
        baseDepthIn: 1.97,
        skuSuffix: "REG",
        priceAdjustmentCents: 0,
        isDefault: true,
        isActive: true
      },
      {
        code: "a4",
        label: "Large - A4",
        frontWidthMm: 210,
        frontHeightMm: 297,
        frontWidthIn: 8.27,
        frontHeightIn: 11.69,
        baseDepthMm: 80,
        baseDepthIn: 3.15,
        skuSuffix: "A4",
        priceAdjustmentCents: null,
        isDefault: false,
        isActive: true
      }
    ],
    colorOptions: [{ code: "white", label: "White", skuSuffix: "WHT", priceAdjustmentCents: 0, isDefault: true, isActive: true }]
  };
});

describe("Stripe checkout helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STRIPE_MODE;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING;
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
      optionLabel: "Standard",
      destinationMode: "DIRECT",
      customizationLevel: "STANDARD",
      manualProductionRequired: false,
      productionWarningCodes: [],
      quantity: 2,
      unitAmountCents: 3900,
      lineSubtotalCents: 7800
    });
    expect(result.totalCents).toBe(7800);
  });

  it("maps Standard Direct QR and NFC targets to the customer destination URL", () => {
    const result = validateCheckoutCart([configuredStandardItem], productsWithBackendGoogleVariants);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      optionId: "standard_direct",
      destinationMode: "DIRECT",
      customizationLevel: "STANDARD",
      proofRequired: false,
      logoRequired: false,
      manualProductionRequired: false,
      productionWarningCodes: []
    });
    expect(result.rows[0].setup).toMatchObject({
      destinationUrl: "https://g.page/example/review",
      generatedQrValue: "https://g.page/example/review",
      qrTargetUrl: "https://g.page/example/review",
      nfcTargetUrl: "https://g.page/example/review",
      hasQr: true,
      nfcOnly: false
    });
    expect(result.rows[0]).toMatchObject({
      sku: "TR-GOOGLE-REV-ST-STD-REG-WHT",
      baseSku: "TR-GOOGLE-REV-ST"
    });
    expect(result.rows[0].setup).toMatchObject({
      baseSku: "TR-GOOGLE-REV-ST",
      finalSku: "TR-GOOGLE-REV-ST-STD-REG-WHT",
      purchaseOptionLabel: "Standard",
      sizeCode: "regular",
      sizeLabel: "Standard",
      colorCode: "white",
      colorLabel: "White"
    });
  });

  it("rejects A4 checkout while its price is pending", () => {
    expect(
      validateCheckoutCart(
        [
          {
            ...configuredStandardItem,
            setup: {
              ...configuredStandardItem.setup,
              sizeCode: "a4",
              colorCode: "white"
            }
          }
        ],
        productsWithBackendGoogleVariants
      )
    ).toMatchObject({ ok: false, reason: "empty_cart" });
  });

  it("rejects DIRECT checkout setup when QR or NFC targets differ from the destination URL", () => {
    expect(
      validateCheckoutCart(
        [
          {
            ...configuredStandardItem,
            setup: {
              ...configuredStandardItem.setup,
              qrTargetUrl: "https://example.com/other"
            }
          }
        ],
        migratedProducts
      )
    ).toMatchObject({ ok: false, reason: "empty_cart" });

    expect(
      validateCheckoutCart(
        [
          {
            ...configuredStandardItem,
            setup: {
              ...configuredStandardItem.setup,
              nfcTargetUrl: "https://example.com/other"
            }
          }
        ],
        migratedProducts
      )
    ).toMatchObject({ ok: false, reason: "empty_cart" });
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
    const products = productsWithBrandedGoogleTemplate();

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
        products
      )
    ).toMatchObject({ ok: false, reason: "empty_cart" });

    const result = validateCheckoutCart(
      [
        {
          productId: "google-review-stand",
          optionId: "branded_qr_direct",
          quantity: 1,
          setup: {
            productSlug: "google-review-stand",
            optionCode: "branded_qr_direct",
            destinationUrl: "https://g.page/example/review",
            businessName: "Nova Implant",
            logoFileName: "fake-local-logo.png",
            logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
            logoStorageKey: "products/customer-setup-google-review-stand/center_asset/logo.png",
            generatedQrValue: "https://g.page/example/review",
            qrTargetUrl: "https://g.page/example/review",
            nfcTargetUrl: "https://g.page/example/review",
            frontTemplateUrl: "/api/media/product/products/google-review-stand/branded_front_template/template.png",
            centerAssetUrl: "/api/media/product/products/google-review-stand/center_asset/google.svg",
            ctaText: "Review us on Google",
            proofPreviewData: {
              businessName: "Nova Implant",
              qrValue: "https://g.page/example/review",
              centerAssetUrl: "/api/media/product/products/google-review-stand/center_asset/google.svg",
              ctaText: "Review us on Google"
            },
            proofApproved: true,
            proofApprovalSnapshot: {
              productSlug: "google-review-stand",
              optionCode: "branded_qr_direct",
              destinationUrl: "https://g.page/example/review",
              businessName: "Nova Implant",
              logoStorageKey: "products/customer-setup-google-review-stand/center_asset/logo.png",
              logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
              generatedQrValue: "https://g.page/example/review",
              frontTemplateUrl: "/api/media/product/products/google-review-stand/branded_front_template/template.png",
              centerAssetUrl: "/api/media/product/products/google-review-stand/center_asset/google.svg",
              ctaText: "Review us on Google"
            }
          }
        }
      ],
      products
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      optionId: "branded_qr_direct",
      destinationMode: "DIRECT",
      customizationLevel: "BRANDED",
      logoRequired: true,
      logoStatus: "uploaded",
      logoReference: "products/customer-setup-google-review-stand/center_asset/logo.png",
      proofRequired: true,
      proofApproved: true,
      productionStatus: "ready_for_direct_fulfillment",
      manualProductionRequired: false,
      productionWarningCodes: []
    });
    expect(result.rows[0].setup).toMatchObject({
      logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
      generatedQrValue: "https://g.page/example/review",
      qrTargetUrl: "https://g.page/example/review",
      nfcTargetUrl: "https://g.page/example/review",
      centerAssetUrl: "/api/media/product/products/google-review-stand/center_asset/google.svg",
      ctaText: "Review us on Google",
      proofApproved: true
    });
  });

  it("allows branded checkout with manual design assistance instead of uploaded logo", () => {
    const result = validateCheckoutCart(
      [
        {
          productId: "google-review-stand",
          optionId: "branded_qr_direct",
          quantity: 1,
          setup: {
            productSlug: "google-review-stand",
            optionCode: "branded_qr_direct",
            destinationUrl: "https://g.page/example/review",
            businessName: "Bingo Tires",
            generatedQrValue: "https://g.page/example/review",
            qrTargetUrl: "https://g.page/example/review",
            nfcTargetUrl: "https://g.page/example/review",
            frontTemplateUrl: "/api/media/product/products/google-review-stand/branded_front_template/template.png",
            designAssistanceRequested: true,
            designNotes: "Please use the logo from my website and remove the white background.",
            manualCollectionAcknowledged: true,
            proofApproved: false
          }
        }
      ],
      productsWithBrandedGoogleTemplate()
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
      productionStatus: "pending_manual_logo_and_proof",
      manualProductionRequired: true,
      productionWarningCodes: ["pending_manual_proof", "do_not_print_until_manual_review"]
    });
    expect(result.rows[0].setup).toMatchObject({
      designAssistanceRequested: true,
      manualCollectionAcknowledged: true,
      designNotes: "Please use the logo from my website and remove the white background."
    });
  });

  it("rejects branded checkout when proof approval no longer matches the current setup", () => {
    const products = productsWithBrandedGoogleTemplate();

    expect(
      validateCheckoutCart(
        [
          {
            productId: "google-review-stand",
            optionId: "branded_qr_direct",
            quantity: 1,
            setup: {
              productSlug: "google-review-stand",
              optionCode: "branded_qr_direct",
              destinationUrl: "https://g.page/example/review",
              businessName: "Changed Business",
              logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
              logoStorageKey: "products/customer-setup-google-review-stand/center_asset/logo.png",
              generatedQrValue: "https://g.page/example/review",
              qrTargetUrl: "https://g.page/example/review",
              nfcTargetUrl: "https://g.page/example/review",
              frontTemplateUrl: "/api/media/product/products/google-review-stand/branded_front_template/template.png",
              proofPreviewData: {
                businessName: "Changed Business",
                qrValue: "https://g.page/example/review"
              },
              proofApproved: true,
              proofApprovalSnapshot: {
                productSlug: "google-review-stand",
                optionCode: "branded_qr_direct",
                destinationUrl: "https://g.page/example/review",
                businessName: "Original Business",
                logoStorageKey: "products/customer-setup-google-review-stand/center_asset/logo.png",
                logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
                generatedQrValue: "https://g.page/example/review",
                frontTemplateUrl: "/api/media/product/products/google-review-stand/branded_front_template/template.png"
              }
            }
          }
        ],
        products
      )
    ).toMatchObject({ ok: false, reason: "empty_cart" });
  });

  it("rejects branded checkout without an approved production artwork front template", () => {
    const products = productsWithBrandedGoogleTemplate();

    expect(
      validateCheckoutCart(
        [
          {
            productId: "google-review-stand",
            optionId: "branded_qr_direct",
            quantity: 1,
            setup: {
              productSlug: "google-review-stand",
              optionCode: "branded_qr_direct",
              destinationUrl: "https://g.page/example/review",
              businessName: "Nova Implant",
              logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
              logoStorageKey: "products/customer-setup-google-review-stand/center_asset/logo.png",
              generatedQrValue: "https://g.page/example/review",
              qrTargetUrl: "https://g.page/example/review",
              nfcTargetUrl: "https://g.page/example/review",
              proofPreviewData: {
                businessName: "Nova Implant",
                qrValue: "https://g.page/example/review"
              },
              proofApproved: true,
              proofApprovalSnapshot: {
                productSlug: "google-review-stand",
                optionCode: "branded_qr_direct",
                destinationUrl: "https://g.page/example/review",
                businessName: "Nova Implant",
                logoStorageKey: "products/customer-setup-google-review-stand/center_asset/logo.png",
                logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
                generatedQrValue: "https://g.page/example/review"
              }
            }
          }
        ],
        products
      )
    ).toMatchObject({ ok: false, reason: "empty_cart" });
  });

  it("uses active backend product option pricing and ignores submitted cart price", () => {
    const googleProduct = migratedProducts.find((product) => product.slug === "google-review-stand");
    if (!googleProduct) throw new Error("Expected Google product fixture");

    const result = validateCheckoutCart(
      [
        {
          ...configuredStandardItem,
          setup: {
            ...configuredStandardItem.setup,
            priceCents: 1
          }
        }
      ],
      [
        {
          ...googleProduct,
          purchaseOptions: [
            {
              optionCode: "standard_direct",
              title: "Standard Direct",
              description: "Backend configured Standard Direct option.",
              priceCents: 4200,
              requiresDestinationUrl: true,
              hasQr: false,
              requiresLogo: false,
              requiresBusinessName: false,
              requiresDesignStep: false,
              requiresFrontProof: false,
              requiresSubscription: false,
              accountRequired: false,
              isActive: true,
              sortOrder: 1
            }
          ]
        }
      ]
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      optionId: "standard_direct",
      optionLabel: "Standard Direct",
      unitAmountCents: 4200,
      lineSubtotalCents: 4200
    });
    expect(result.totalCents).toBe(4200);
  });

  it("rejects forced checkout for options missing from backend product options", () => {
    const googleProduct = migratedProducts.find((product) => product.slug === "google-review-stand");
    if (!googleProduct) throw new Error("Expected Google product fixture");

    const result = validateCheckoutCart(
      [
        {
          productId: "google-review-stand",
          optionId: "branded_qr_direct",
          quantity: 1,
          setup: {
            destinationUrl: "https://g.page/example/review",
            businessName: "Nova Implant",
            logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
            logoStorageKey: "products/customer-setup-google-review-stand/center_asset/logo.png",
            generatedQrValue: "https://g.page/example/review",
            proofPreviewData: {
              businessName: "Nova Implant"
            },
            proofApproved: true
          }
        }
      ],
      [
        {
          ...googleProduct,
          purchaseOptions: [
            {
              optionCode: "standard_direct",
              title: "Standard Direct",
              description: "Backend configured Standard Direct option.",
              priceCents: 3900,
              requiresDestinationUrl: true,
              hasQr: false,
              requiresLogo: false,
              requiresBusinessName: false,
              requiresDesignStep: false,
              requiresFrontProof: false,
              requiresSubscription: false,
              accountRequired: false,
              isActive: true,
              sortOrder: 1
            }
          ]
        }
      ]
    );

    expect(result).toMatchObject({ ok: false, reason: "empty_cart" });
  });

  it("rejects checkout when a backend product has no active options", () => {
    const googleProduct = migratedProducts.find((product) => product.slug === "google-review-stand");
    if (!googleProduct) throw new Error("Expected Google product fixture");

    const result = validateCheckoutCart([configuredStandardItem], [{ ...googleProduct, purchaseOptions: [] }]);

    expect(result).toMatchObject({ ok: false, reason: "empty_cart" });
  });

  it("rejects Hosted Multi-Link subscription checkout while Hosted purchasing is disabled", () => {
    process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING = "false";
    const hostedProduct = {
      ...migratedProducts.find((product) => product.slug === "custom-direct-stand")!,
      slug: "hosted-multilink-stand",
      productKind: "hosted_multilink" as const,
      productType: "platform_landing_page" as const,
      serviceMode: "hosted_landing_page" as const,
      checkoutMode: "subscription" as const,
      requiresAccount: true,
      requiresSubscription: true,
      requiresLandingPage: true,
      isActive: true
    };
    const result = validateCheckoutCart(
      [
        {
          productId: "hosted-multilink-stand",
          optionId: "hosted_multilink",
          quantity: 1,
          setup: {
            businessName: "Nova Implant",
            manualCollectionAcknowledged: true
          }
        }
      ],
      [hostedProduct]
    );

    expect(result).toMatchObject({ ok: false, reason: "empty_cart" });
  });

  it("accepts Multi-Link as a service add-on without assigning a permanent code when explicitly enabled", () => {
    process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING = "true";
    const compatibleProduct = migratedProducts.find((product) => product.slug === "follow-us-social-media-stand")!;
    const result = validateCheckoutCart(
      [
        {
          productId: "follow-us-social-media-stand",
          optionId: "standard_direct",
          quantity: 1,
          setup: {
            serviceMode: "HOSTED",
            serviceAddon: "hosted_multilink",
            multiLinkButtons: [
              { id: "link-1", type: "website", label: "Website", url: "https://example.com", enabled: true, position: 0 }
            ],
            manualCollectionAcknowledged: true
          }
        }
      ],
      [compatibleProduct]
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checkoutMode).toBe("subscription");
    expect(result.totalCents).toBe(3900);
    expect(result.recurringTotalCents).toBe(999);
    expect(result.rows[0]).toMatchObject({
      optionId: "standard_direct",
      destinationMode: "HOSTED",
      customizationLevel: "STANDARD",
      monthlyAmountCents: 999
    });
    expect(result.rows[0].setup).not.toHaveProperty("hostedPageCode");
    expect(result.rows[0].setup.multiLinkButtons).toEqual([
      { id: "link-1", type: "website", label: "Website", url: "https://example.com", enabled: true, position: 0 }
    ]);
  });

  it("rejects Multi-Link add-on checkout when an enabled draft link URL is invalid", () => {
    process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING = "true";
    const compatibleProduct = migratedProducts.find((product) => product.slug === "follow-us-social-media-stand")!;
    const result = validateCheckoutCart(
      [
        {
          productId: "follow-us-social-media-stand",
          optionId: "standard_direct",
          quantity: 1,
          setup: {
            serviceMode: "HOSTED",
            serviceAddon: "hosted_multilink",
            multiLinkButtons: [
              { id: "link-1", type: "website", label: "Website", url: "not-a-url", enabled: true, position: 0 }
            ]
          }
        }
      ],
      [compatibleProduct]
    );

    expect(result).toMatchObject({ ok: false, reason: "empty_cart" });
  });

  it("rejects a HOSTED option attached to a DIRECT product", () => {
    const result = validateCheckoutCart(
      [
        {
          productId: "google-review-stand",
          optionId: "hosted_multilink",
          quantity: 1,
          setup: {
            businessName: "Nova Implant"
          }
        }
      ],
      migratedProducts
    );

    expect(result).toMatchObject({ ok: false, reason: "empty_cart" });
  });

  it("rejects premature permanent hosted page codes during cart checkout", () => {
    const result = validateCheckoutCart(
      [
        {
          productId: "google-review-stand",
          optionId: "standard_direct",
          quantity: 1,
          setup: {
            destinationUrl: "https://g.page/example/review",
            hostedPageCode: "ABC123"
          } as any
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
    const result = validateCheckoutCart([configuredStandardItem], productsWithBackendGoogleVariants);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(buildStripeCheckoutLineItems(result.rows)).toEqual([
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: {
            name: "Google Review Stand",
            description: "Standard - Countertop Google Review Stand with NFC and QR. Customers tap or scan to open your Google review link directly-no app or subscription required.",
            metadata: {
              product_id: "google-review-stand",
              option_id: "standard_direct",
              sku: "TR-GOOGLE-REV-ST-STD-REG-WHT"
            }
          },
          unit_amount: 3900
        }
      }
    ]);
  });

  it("creates embedded Checkout Session params with dynamic price_data and mode metadata", () => {
    const result = validateCheckoutCart([configuredStandardItem], migratedProducts);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const params = createCheckoutSessionParams({
      cart: result,
      siteUrl: "https://taprater.com"
    });

    expect(params.mode).toBe("payment");
    expect(params.ui_mode).toBe("embedded_page");
    expect(params.return_url).toBe("https://taprater.com/checkout/success?session_id={CHECKOUT_SESSION_ID}");
    expect(params).not.toHaveProperty("success_url");
    expect(params).not.toHaveProperty("cancel_url");
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
    expect(params.metadata?.recurring_total_cents).toBe("0");
    expect(params.metadata?.checkout_intent).toBe("direct_payment");
    expect(params.metadata?.configured_items).toBe("1");
    expect(params.metadata?.shipping_mode).toBe("manual");
    expect(params.metadata?.shipping_amount_cents).toBe("0");
    expect(params.shipping_address_collection?.allowed_countries).toEqual(["US"]);
    expect(params.shipping_options).toBeUndefined();
    expect(params.metadata).not.toHaveProperty("order_items");
  });

  it("creates card-only subscription Checkout Session params for Multi-Link add-ons with one-time and monthly lines when explicitly enabled", () => {
    process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING = "true";
    const compatibleProduct = migratedProducts.find((product) => product.slug === "follow-us-social-media-stand")!;
    const result = validateCheckoutCart(
      [
        {
          productId: "follow-us-social-media-stand",
          optionId: "standard_direct",
          quantity: 1,
          setup: {
            serviceMode: "HOSTED",
            serviceAddon: "hosted_multilink",
            manualCollectionAcknowledged: true
          }
        }
      ],
      [compatibleProduct]
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const params = createCheckoutSessionParams({
      cart: result,
      siteUrl: "https://taprater.com"
    });

    expect(params.mode).toBe("subscription");
    expect(params.payment_method_types).toEqual(["card"]);
    expect(params.metadata?.checkout_intent).toBe("hosted_subscription");
    expect(params.metadata?.recurring_total_cents).toBe("999");
    expect(params.line_items).toHaveLength(2);
    expect(params.line_items?.[0]).toMatchObject({
      price_data: {
        unit_amount: 3900
      }
    });
    expect(params.line_items?.[1]).toMatchObject({
      price_data: {
        unit_amount: 999,
        recurring: {
          interval: "month"
        }
      }
    });
  });

  it("adds configured flat shipping to Checkout Session params", () => {
    const result = validateCheckoutCart([configuredStandardItem], migratedProducts);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const params = createCheckoutSessionParams({
      cart: result,
      siteUrl: "https://taprater.com",
      shippingSettings: {
        shippingMode: "flat",
        flatShippingAmountCents: 795,
        allowedCountryCodes: ["US"],
        handlingTimeText: "",
        supportedRegionsText: "United States",
        defaultCarrierNotes: "",
        customerFacingShippingNote: ""
      }
    });

    expect(params.metadata?.shipping_mode).toBe("flat");
    expect(params.metadata?.shipping_amount_cents).toBe("795");
    expect(params.shipping_options?.[0]).toMatchObject({
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: "Flat rate shipping",
        fixed_amount: {
          amount: 795,
          currency: "usd"
        }
      }
    });
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

  it("prefers the request origin for checkout redirects over build-time site env", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    expect(getCheckoutSiteUrl("https://taprater.com")).toBe("https://taprater.com");
    expect(getCheckoutSiteUrl()).toBe("http://localhost:3000");
  });
});

function productsWithBrandedGoogleTemplate(): MigratedProduct[] {
  return migratedProducts.map((product) => {
    if (product.slug !== "google-review-stand") {
      return product;
    }

    return {
      ...product,
      assetSet: {
        ...product.assetSet,
        brandedFrontTemplateUrl: "/api/media/product/products/google-review-stand/branded_front_template/template.png",
        centerAssetUrl: "/api/media/product/products/google-review-stand/center_asset/google.svg"
      }
    };
  });
}
