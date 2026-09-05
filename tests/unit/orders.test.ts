import { describe, expect, it, vi } from "vitest";
import { formatOrderReference } from "@/lib/order-reference";
import {
  applyAdminOrderProductionActionWithClient,
  applyOrderLineItemFulfillmentInference,
  getOrderLineItemFulfillmentKind,
  getOrderLineItemProductionSummary,
  mapCheckoutRowsToOrderLineItems,
  mapCheckoutRowsToProductionReadyOrderLineItems,
  mapCheckoutSessionToOrderInput,
  markCheckoutOrderPaymentFailureWithClient,
  savePaidOrderFromCheckoutSessionWithClient,
  updateOrderFulfillmentWithClient,
  type OrdersDbClient
} from "@/lib/orders";
import { orderFulfillmentUpdateSchema } from "@/lib/validators";
import type { EmbeddedProductionAsset, ProductionArtworkAssetResolver } from "@/lib/production-artwork";

const generatedProductionArtwork = {
  status: "generated",
  storageKey: "products/google-review-stand/production_artwork/cs-test/line-1-hash.svg",
  url: "/api/media/product/products/google-review-stand/production_artwork/cs-test/line-1-hash.svg",
  format: "svg",
  contentType: "image/svg+xml",
  widthPx: 1278,
  heightPx: 1949,
  dpi: 300,
  widthIn: 4.26,
  heightIn: 6.4967,
  templateId: "taprater-branded-stand-front",
  templateVersion: "2026-08-31.1",
  approvalSnapshotHash: "hash",
  baseTemplateContentHash: "base-template-hash",
  logoContentHash: "logo-hash",
  generatedAt: "2026-08-23T14:00:00.000Z"
};

const embeddedAssets: Record<string, EmbeddedProductionAsset> = {
  "/api/media/product/products/google-review/front-template.png": {
    dataUri: "data:image/svg+xml;base64,PHN2Zy8+",
    contentType: "image/svg+xml",
    contentHash: "base-template-hash"
  },
  "/api/media/product/products/customer-setup/logo.png": {
    dataUri: "data:image/png;base64,iVBORw0KGgo=",
    contentType: "image/png",
    contentHash: "logo-hash"
  },
  "/api/media/product/products/google-review/center/google.svg": {
    dataUri: "data:image/svg+xml;base64,PHN2Zy8+",
    contentType: "image/svg+xml",
    contentHash: "center-hash"
  }
};

describe("order references", () => {
  it("keeps branded Tap Rater order numbers clean", () => {
    expect(formatOrderReference("tr-260901-ab12cd")).toBe("TR-260901-AB12CD");
  });

  it("formats legacy manual references as short customer order numbers", () => {
    const formatted = formatOrderReference("manual_0ed962ff-f896-429a-85e2-f90695fb6752");

    expect(formatted).toMatch(/^TR-[A-Z0-9]{6}$/);
    expect(formatted).not.toContain("manual_");
  });
});

const memoryAssetResolver: ProductionArtworkAssetResolver = async (url) => {
  const asset = embeddedAssets[url];
  if (!asset) throw new Error(`Missing test asset: ${url}`);
  return asset;
};

describe("orders repository", () => {
  it("marks only pending checkout orders as expired", async () => {
    const rows = [
      {
        id: "pending",
        stripe_checkout_session_id: "cs_expired",
        status: "pending_payment",
        payment_status: "unpaid"
      },
      {
        id: "paid",
        stripe_checkout_session_id: "cs_paid",
        status: "paid",
        payment_status: "paid"
      }
    ];

    const result = await markCheckoutOrderPaymentFailureWithClient(
      createOrdersMemoryClient(rows),
      "cs_expired",
      "canceled",
      "expired"
    );

    expect(result).toEqual({ ok: true });
    expect(rows[0]).toMatchObject({ status: "canceled", payment_status: "expired" });
    expect(rows[1]).toMatchObject({ status: "paid", payment_status: "paid" });
  });

  it("preserves uploaded logo and branded proof status in order line items", () => {
    const items = mapCheckoutRowsToOrderLineItems([
      {
        productId: "google-review-stand",
        optionId: "branded_qr_direct",
        optionLabel: "Branded + QR Direct Stand",
        destinationMode: "DIRECT",
        customizationLevel: "BRANDED",
        title: "Google Review Stand",
        sku: "TR-GOOGLE-STAND",
        quantity: 1,
        unitAmountCents: 4900,
        lineSubtotalCents: 4900,
        shortDescription: "Google review stand",
        setup: {
          destinationUrl: "https://g.page/example/review",
          businessName: "Nova Implant",
          logoStorageKey: "products/customer-setup-google-review-stand/center_asset/logo.png",
          logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
          generatedQrValue: "https://g.page/example/review",
          qrTargetUrl: "https://g.page/example/review",
          nfcTargetUrl: "https://g.page/example/review",
          proofApproved: true
        },
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
      }
    ]);

    expect(items[0]).toMatchObject({
      optionLabel: "Branded + QR Direct Stand",
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
  });

  it("generates production artwork while preparing pending order line items", async () => {
    const writes = new Map<string, string>();
    const items = await mapCheckoutRowsToProductionReadyOrderLineItems(
      [
        {
          productId: "google-review-stand",
          optionId: "branded_qr_direct",
          optionLabel: "Branded + QR Direct Stand",
          destinationMode: "DIRECT",
          customizationLevel: "BRANDED",
          title: "Google Review Stand",
          sku: "TR-GOOGLE-STAND",
          quantity: 1,
          unitAmountCents: 4900,
          lineSubtotalCents: 4900,
          shortDescription: "Google review stand",
          setup: {
            productSlug: "google-review-stand",
            optionCode: "branded_qr_direct",
            destinationUrl: "https://g.page/example/review",
            businessName: "Nova Implant",
            logoStorageKey: "products/customer-setup/logo.png",
            logoMediaUrl: "/api/media/product/products/customer-setup/logo.png",
            generatedQrValue: "https://g.page/example/review",
            qrTargetUrl: "https://g.page/example/review",
            nfcTargetUrl: "https://g.page/example/review",
            frontTemplateUrl: "/api/media/product/products/google-review/front-template.png",
            proofApproved: true,
            proofApprovalSnapshot: {
              productSlug: "google-review-stand",
              optionCode: "branded_qr_direct",
              destinationUrl: "https://g.page/example/review",
              businessName: "Nova Implant",
              logoStorageKey: "products/customer-setup/logo.png",
              logoMediaUrl: "/api/media/product/products/customer-setup/logo.png",
              generatedQrValue: "https://g.page/example/review",
              frontTemplateUrl: "/api/media/product/products/google-review/front-template.png"
            },
            proofPreviewData: {
              businessName: "Nova Implant",
              qrValue: "https://g.page/example/review",
              frontTemplateUrl: "/api/media/product/products/google-review/front-template.png"
            }
          },
          logoRequired: true,
          logoStatus: "uploaded",
          logoReference: "products/customer-setup/logo.png",
          proofRequired: true,
          proofApproved: true,
          productionStatus: "ready_for_direct_fulfillment",
          manualProductionRequired: false,
          productionWarningCodes: []
        }
      ],
      "cs_test_order",
      {
        async put(key, value) {
          writes.set(key, value);
        }
      },
      memoryAssetResolver
    );

    expect(items[0]).toMatchObject({
      productionStatus: "ready_for_direct_fulfillment",
      manualProductionRequired: false,
      productionWarningCodes: []
    });
    expect(items[0].setup?.productionArtwork).toMatchObject({
      status: "generated",
      templateId: "taprater-branded-stand-front",
      templateVersion: "2026-08-31.1",
      baseTemplateContentHash: "base-template-hash",
      logoContentHash: "logo-hash"
    });
    expect(writes.size).toBe(1);
  });

  it("infers manual logo and proof requirements for legacy branded orders with weak booleans", () => {
    const item = applyOrderLineItemFulfillmentInference({
      productId: "google-review-stand",
      optionId: "branded_qr_direct",
      optionLabel: "Branded + QR Direct Stand",
      title: "Google Review Stand",
      sku: "TR-GOOGLE-STAND",
      quantity: 1,
      unitAmountCents: 4900,
      lineSubtotalCents: 4900,
      setup: {
        destinationUrl: "https://g.page/example/review",
        businessName: "Nova Implant"
      },
      logoRequired: false,
      proofRequired: false,
      proofApproved: false,
      productionStatus: "ready_for_direct_activation",
      manualProductionRequired: false,
      productionWarningCodes: []
    });

    expect(getOrderLineItemFulfillmentKind(item)).toBe("branded");
    expect(item).toMatchObject({
      logoRequired: true,
      logoStatus: "manual_collection_required",
      proofRequired: true,
      proofApproved: false,
      productionStatus: "pending_manual_logo_and_proof",
      manualProductionRequired: true,
      productionWarningCodes: [
        "pending_manual_proof",
        "asset_storage_not_configured",
        "do_not_print_until_manual_review"
      ]
    });
  });

  it("infers manual design and proof requirements for legacy custom orders", () => {
    const item = applyOrderLineItemFulfillmentInference({
      productId: "custom-direct-stand",
      optionId: "custom_direct",
      optionLabel: "Custom Direct Stand",
      title: "Custom Direct Stand",
      sku: "TR-CUSTOM-DIRECT",
      quantity: 1,
      unitAmountCents: 4900,
      lineSubtotalCents: 4900,
      setup: {
        destinationUrl: "https://example.com",
        businessName: "Nova Implant",
        headline: "Scan to connect"
      },
      logoRequired: false,
      proofRequired: false,
      proofApproved: false,
      manualProductionRequired: false,
      productionWarningCodes: []
    });

    expect(getOrderLineItemFulfillmentKind(item)).toBe("custom");
    expect(item).toMatchObject({
      logoRequired: true,
      logoStatus: "manual_collection_required",
      proofRequired: true,
      proofApproved: false,
      productionStatus: "pending_manual_design_and_proof",
      manualProductionRequired: true,
      productionWarningCodes: [
        "pending_manual_proof",
        "asset_storage_not_configured",
        "do_not_print_until_manual_review"
      ]
    });
  });

  it("keeps standard direct orders clean when no manual proof is needed", () => {
    const item = applyOrderLineItemFulfillmentInference({
      productId: "google-review-stand",
      optionId: "standard_direct",
      optionLabel: "Standard Direct Stand",
      title: "Google Review Stand",
      sku: "TR-GOOGLE-STAND",
      quantity: 1,
      unitAmountCents: 3900,
      lineSubtotalCents: 3900,
      setup: {
        destinationUrl: "https://g.page/example/review",
        proofApproved: true
      }
    });

    expect(getOrderLineItemFulfillmentKind(item)).toBe("standard");
    expect(item).toMatchObject({
      logoRequired: false,
      logoStatus: "not_required",
      proofRequired: false,
      proofApproved: false,
      productionStatus: "ready_for_direct_fulfillment",
      manualProductionRequired: false,
      productionWarningCodes: []
    });
  });

  it("classifies a standard physical stand with the Multi-Link add-on as hosted", () => {
    const item = applyOrderLineItemFulfillmentInference({
      productId: "rate-your-experience-stand",
      optionId: "standard_direct",
      optionLabel: "Standard Direct Stand",
      destinationMode: "HOSTED",
      title: "Rate Your Experience Stand",
      sku: "TR-RATE-YOUR-EXP-ST",
      quantity: 1,
      unitAmountCents: 3900,
      lineSubtotalCents: 3900,
      setup: {
        serviceMode: "HOSTED",
        serviceAddon: "hosted_multilink",
        businessName: "Norah Boutique",
        hostedPageCode: "ABC123ABC123",
        qrTargetUrl: "https://taprater.com/p/ABC123ABC123",
        nfcTargetUrl: "https://taprater.com/p/ABC123ABC123"
      }
    });

    expect(getOrderLineItemFulfillmentKind(item)).toBe("hosted");
    expect(item).toMatchObject({
      destinationMode: "HOSTED",
      logoRequired: true,
      proofRequired: true
    });
  });

  it("summarizes Standard Direct fulfillment without QR or proof warnings", () => {
    const summary = getOrderLineItemProductionSummary({
      productId: "google-review-stand",
      optionId: "standard_direct",
      optionLabel: "Standard Direct Stand",
      title: "Google Review Stand",
      sku: "GRS",
      quantity: 2,
      unitAmountCents: 3900,
      lineSubtotalCents: 7800,
      setup: {
        destinationUrl: "https://g.page/example/review",
        destinationType: "review",
        platformSlug: "google"
      }
    });

    expect(summary).toMatchObject({
      fulfillmentKind: "standard",
      optionLabel: "Standard Direct",
      nfcBehavior: "DIRECT NFC",
      printedQrLabel: "DIRECT QR",
      destinationUrl: "https://g.page/example/review",
      statusLabel: "Ready for direct fulfillment",
      statusTone: "ready",
      warnings: []
    });
  });

  it("summarizes complete Branded + QR fulfillment as ready for production review", () => {
    const summary = getOrderLineItemProductionSummary({
      productId: "google-review-stand",
      optionId: "branded_qr_direct",
      optionLabel: "Branded + QR Direct Stand",
      title: "Google Review Stand",
      sku: "GRS",
      quantity: 1,
      unitAmountCents: 4900,
      lineSubtotalCents: 4900,
      setup: {
        destinationUrl: "https://g.page/example/review",
        destinationType: "review",
        platformSlug: "google",
        businessName: "Nova Implant",
        logoMediaUrl: "/api/media/product/products/customer-setup/logo.png",
        logoStorageKey: "products/customer-setup/logo.png",
        generatedQrValue: "https://g.page/example/review",
        frontTemplateUrl: "/api/media/product/products/google-review/front-template.png",
        centerAssetUrl: "/api/media/product/products/google-review/center/google.svg",
        ctaText: "Review us on Google",
        productionArtwork: generatedProductionArtwork
      },
      logoReference: "products/customer-setup/logo.png",
      proofApproved: true
    });

    expect(summary).toMatchObject({
      fulfillmentKind: "branded",
      optionLabel: "Branded + QR Direct",
      nfcBehavior: "DIRECT NFC",
      printedQrLabel: "DIRECT QR",
      businessName: "Nova Implant",
      logoReference: "products/customer-setup/logo.png",
      generatedQrValue: "https://g.page/example/review",
      qrTargetUrl: "https://g.page/example/review",
      nfcTargetUrl: "https://g.page/example/review",
      frontTemplateUrl: "/api/media/product/products/google-review/front-template.png",
      productionArtwork: generatedProductionArtwork,
      proofConfirmed: true,
      statusLabel: "Ready for production review",
      statusTone: "ready",
      warnings: []
    });
  });

  it("summarizes incomplete Branded + QR fulfillment with specific missing setup warnings", () => {
    const summary = getOrderLineItemProductionSummary({
      productId: "google-review-stand",
      optionId: "branded_qr_direct",
      optionLabel: "Branded + QR Direct Stand",
      title: "Google Review Stand",
      sku: "GRS",
      quantity: 1,
      unitAmountCents: 4900,
      lineSubtotalCents: 4900,
      setup: {
        destinationUrl: "https://g.page/example/review"
      },
      proofApproved: false
    });

    expect(summary.statusLabel).toBe("Needs setup review");
    expect(summary.statusTone).toBe("warning");
    expect(summary.warnings).toEqual([
      "Missing business name",
      "Missing logo",
      "Missing branded front template",
      "Proof not confirmed",
      "Production artwork not generated"
    ]);
  });

  it("maps a paid Stripe Checkout Session into a Supabase order payload", () => {
    const order = mapCheckoutSessionToOrderInput({
      id: "cs_test_123",
      payment_intent: "pi_test_123",
      payment_status: "paid",
      amount_subtotal: 4900,
      amount_total: 4900,
      currency: "usd",
      customer_details: {
        email: "buyer@example.com",
        name: "Buyer Name"
      },
      metadata: {
        order_items: JSON.stringify([
          {
            productId: "google-review-white-stand",
            title: "White Stand - Google Review",
            sku: "TRATER01",
            quantity: 1,
            unitAmountCents: 4900,
            lineSubtotalCents: 4900
          }
        ])
      }
    });

    expect(order).toMatchObject({
      stripe_checkout_session_id: "cs_test_123",
      stripe_payment_intent_id: "pi_test_123",
      status: "paid",
      payment_status: "paid",
      email: "buyer@example.com",
      subtotal_cents: 4900,
      total_cents: 4900,
      currency: "usd"
    });
    expect(order.line_items_json).toHaveLength(1);
  });

  it("normalizes Stripe shipping details into order shipping fields", () => {
    const order = mapCheckoutSessionToOrderInput({
      id: "cs_test_shipping",
      payment_status: "paid",
      amount_subtotal: 3900,
      amount_total: 4695,
      currency: "usd",
      customer_details: {
        email: "buyer@example.com",
        name: "Buyer Name",
        phone: "555-0100"
      },
      shipping_details: {
        name: "Receiving Team",
        phone: "555-0101",
        address: {
          line1: "100 Main St",
          city: "Erbil",
          state: "NY",
          postal_code: "10001",
          country: "US"
        }
      },
      shipping_cost: {
        amount_total: 795
      },
      metadata: {
        shipping_mode: "flat",
        shipping_amount_cents: "795"
      }
    });

    expect(order.shipping_address_json).toEqual({
      name: "Receiving Team",
      phone: "555-0101",
      address: {
        line1: "100 Main St",
        city: "Erbil",
        state: "NY",
        postal_code: "10001",
        country: "US"
      }
    });
    expect(order.shipping_amount_cents).toBe(795);
    expect(order.shipping_mode).toBe("flat");
  });

  it("updates fulfillment fields and sets shipped timestamp when marking shipped", async () => {
    const rows = [fulfillmentOrder({ production_status: "in_production" })];
    const client = createOrdersMemoryClient(rows);

    const result = await updateOrderFulfillmentWithClient(client, "order-123", {
      productionStatus: "completed",
      shippingStatus: "ready_to_ship",
      shippingMethod: "Ground",
      shippingCarrier: "USPS",
      trackingNumber: "TRACK123",
      trackingUrl: "https://example.com/track/TRACK123",
      internalNotes: "Packed carefully.",
      adminFulfillmentNotes: "Ready.",
      markShipped: true
    }, {
      now: () => "2026-09-05T12:00:00.000Z",
      sendShippingNotificationEmailFn: vi.fn().mockResolvedValue({ sent: true })
    });

    expect(result).toEqual({ ok: true, shippingEmail: { sent: true } });
    expect(rows[0]).toMatchObject({
      production_status: "completed",
      shipping_status: "shipped",
      shipping_method: "Ground",
      shipping_carrier: "USPS",
      tracking_number: "TRACK123",
      tracking_url: "https://example.com/track/TRACK123",
      internal_notes: "Packed carefully.",
      admin_fulfillment_notes: "Ready.",
      shipped_at: "2026-09-05T12:00:00.000Z"
    });
  });

  it("sends shipping notification once when transitioning to shipped with tracking", async () => {
    const rows: Record<string, any>[] = [
      {
        id: "order-123",
        stripe_checkout_session_id: "cs_test_shipping_email",
        status: "paid",
        payment_status: "paid",
        email: "buyer@example.com",
        customer_name: "Buyer",
        subtotal_cents: 3900,
        total_cents: 3900,
        currency: "usd",
        line_items_json: [],
        shipping_amount_cents: 0,
        production_status: "completed",
        shipping_status: "ready_to_ship",
        internal_notes: "Internal note",
        admin_fulfillment_notes: "Admin note"
      }
    ];
    const client = createOrdersMemoryClient(rows);
    const sendShippingNotificationEmailFn = vi.fn().mockResolvedValue({ sent: true });

    const result = await updateOrderFulfillmentWithClient(
      client,
      "order-123",
      {
        productionStatus: "completed",
        shippingStatus: "ready_to_ship",
        shippingMethod: "Ground",
        shippingCarrier: "USPS",
        trackingNumber: "TRACK123",
        trackingUrl: "https://example.com/track/TRACK123",
        internalNotes: "Updated internal note",
        adminFulfillmentNotes: "Updated admin note",
        markShipped: true
      },
      { sendShippingNotificationEmailFn }
    );

    expect(result).toEqual({ ok: true, shippingEmail: { sent: true } });
    expect(rows[0]).toMatchObject({ shipping_status: "shipped", tracking_number: "TRACK123" });
    expect(sendShippingNotificationEmailFn).toHaveBeenCalledWith({
      order: expect.objectContaining({
        id: "order-123",
        email: "buyer@example.com",
        shipping_status: "shipped",
        shipping_carrier: "USPS",
        tracking_number: "TRACK123",
        tracking_url: "https://example.com/track/TRACK123"
      })
    });
  });

  it("treats selecting shipped directly as the first shipping transition", async () => {
    const rows = [fulfillmentOrder({ production_status: "completed", shipping_status: "ready_to_ship" })];
    const sendShippingNotificationEmailFn = vi.fn().mockResolvedValue({ sent: true });

    const result = await updateOrderFulfillmentWithClient(
      createOrdersMemoryClient(rows),
      "order-123",
      {
        productionStatus: "completed",
        shippingStatus: "shipped",
        shippingMethod: "Ground",
        shippingCarrier: "USPS",
        trackingNumber: "TRACK456",
        trackingUrl: "https://example.com/track/TRACK456",
        internalNotes: "",
        adminFulfillmentNotes: "",
        markShipped: false
      },
      { sendShippingNotificationEmailFn, now: () => "2026-09-05T14:00:00.000Z" }
    );

    expect(result).toEqual({ ok: true, shippingEmail: { sent: true } });
    expect(rows[0]).toMatchObject({
      shipping_status: "shipped",
      shipped_at: "2026-09-05T14:00:00.000Z"
    });
    expect(sendShippingNotificationEmailFn).toHaveBeenCalledTimes(1);
  });

  it("does not resend shipping email for unrelated edits to an already shipped order", async () => {
    const rows: Record<string, any>[] = [
      {
        id: "order-123",
        stripe_checkout_session_id: "cs_test_shipping_email",
        status: "paid",
        payment_status: "paid",
        email: "buyer@example.com",
        subtotal_cents: 3900,
        total_cents: 3900,
        currency: "usd",
        line_items_json: [],
        shipping_amount_cents: 0,
        production_status: "completed",
        shipping_status: "shipped",
        shipped_at: "2026-09-04T12:00:00.000Z",
        tracking_number: "TRACK123",
        internal_notes: "",
        admin_fulfillment_notes: ""
      }
    ];
    const sendShippingNotificationEmailFn = vi.fn();

    const result = await updateOrderFulfillmentWithClient(
      createOrdersMemoryClient(rows),
      "order-123",
      {
        productionStatus: "completed",
        shippingStatus: "shipped",
        shippingMethod: "Ground",
        shippingCarrier: "USPS",
        trackingNumber: "TRACK123",
        trackingUrl: "https://example.com/track/TRACK123",
        internalNotes: "Unrelated edit",
        adminFulfillmentNotes: "",
        markShipped: true
      },
      { sendShippingNotificationEmailFn }
    );

    expect(result).toEqual({ ok: true });
    expect(sendShippingNotificationEmailFn).not.toHaveBeenCalled();
    expect(rows[0].shipped_at).toBe("2026-09-04T12:00:00.000Z");
  });

  it("does not roll back shipping state when shipping email fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const rows: Record<string, any>[] = [
      {
        id: "order-123",
        stripe_checkout_session_id: "cs_test_shipping_email",
        status: "paid",
        payment_status: "paid",
        email: "buyer@example.com",
        subtotal_cents: 3900,
        total_cents: 3900,
        currency: "usd",
        line_items_json: [],
        shipping_amount_cents: 0,
        production_status: "completed",
        shipping_status: "ready_to_ship",
        internal_notes: "",
        admin_fulfillment_notes: ""
      }
    ];

    const result = await updateOrderFulfillmentWithClient(
      createOrdersMemoryClient(rows),
      "order-123",
      {
        productionStatus: "completed",
        shippingStatus: "ready_to_ship",
        shippingMethod: "Ground",
        shippingCarrier: "USPS",
        trackingNumber: "TRACK123",
        trackingUrl: "https://example.com/track/TRACK123",
        internalNotes: "",
        adminFulfillmentNotes: "",
        markShipped: true
      },
      { sendShippingNotificationEmailFn: vi.fn().mockResolvedValue({ sent: false, reason: "missing_api_key" }) }
    );

    expect(result).toEqual({ ok: true, shippingEmail: { sent: false, reason: "missing_api_key" } });
    expect(rows[0]).toMatchObject({ shipping_status: "shipped", tracking_number: "TRACK123" });
    expect(warn).toHaveBeenCalledWith("[orders] shipping_email_not_sent", expect.objectContaining({ reason: "missing_api_key" }));
  });

  it("keeps a shipped order saved when the email sender throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const rows = [fulfillmentOrder({ production_status: "completed", shipping_status: "ready_to_ship" })];

    const result = await updateOrderFulfillmentWithClient(
      createOrdersMemoryClient(rows),
      "order-123",
      {
        productionStatus: "completed",
        shippingStatus: "shipped",
        shippingMethod: "Ground",
        shippingCarrier: "USPS",
        trackingNumber: "TRACK789",
        trackingUrl: "",
        internalNotes: "",
        adminFulfillmentNotes: "",
        markShipped: false
      },
      { sendShippingNotificationEmailFn: vi.fn().mockRejectedValue(new Error("provider unavailable")) }
    );

    expect(result).toEqual({ ok: true, shippingEmail: { sent: false, reason: "email_send_exception" } });
    expect(rows[0]).toMatchObject({ shipping_status: "shipped", tracking_number: "TRACK789" });
    expect(warn).toHaveBeenCalledWith("[orders] shipping_email_not_sent", expect.objectContaining({ reason: "email_send_exception" }));
  });

  it("blocks fulfillment and production actions while payment is unconfirmed", async () => {
    const rows = [fulfillmentOrder({
      status: "pending_payment",
      payment_status: "manual_unpaid",
      production_status: "ready_for_production"
    })];
    const client = createOrdersMemoryClient(rows);

    await expect(
      updateOrderFulfillmentWithClient(client, "order-123", {
        productionStatus: "in_production",
        shippingStatus: "not_shipped",
        shippingMethod: "",
        shippingCarrier: "",
        trackingNumber: "",
        trackingUrl: "",
        internalNotes: "",
        adminFulfillmentNotes: "",
        markShipped: false
      })
    ).resolves.toEqual({
      ok: false,
      error: "Only internal notes can be changed until payment is confirmed.",
      status: 409
    });
    await expect(
      applyAdminOrderProductionActionWithClient(client, "order-123", { action: "regenerate_artwork" })
    ).resolves.toEqual({
      ok: false,
      error: "Production actions are unavailable until payment is confirmed.",
      status: 409
    });
    expect(rows[0].production_status).toBe("ready_for_production");
  });

  it("allows notes-only saves while an order is on payment hold", async () => {
    const rows = [fulfillmentOrder({
      status: "pending_payment",
      payment_status: "manual_unpaid",
      production_status: "ready_for_production"
    })];

    await expect(
      updateOrderFulfillmentWithClient(createOrdersMemoryClient(rows), "order-123", {
        productionStatus: "ready_for_production",
        shippingStatus: "not_shipped",
        shippingMethod: "",
        shippingCarrier: "",
        trackingNumber: "",
        trackingUrl: "",
        internalNotes: "Awaiting payment confirmation.",
        adminFulfillmentNotes: "Do not produce yet.",
        markShipped: false
      })
    ).resolves.toEqual({ ok: true });
    expect(rows[0]).toMatchObject({
      production_status: "ready_for_production",
      internal_notes: "Awaiting payment confirmation.",
      admin_fulfillment_notes: "Do not produce yet."
    });
  });

  it("blocks production actions after shipment", async () => {
    const rows = [fulfillmentOrder({ production_status: "completed", shipping_status: "shipped" })];

    await expect(
      applyAdminOrderProductionActionWithClient(
        createOrdersMemoryClient(rows),
        "order-123",
        { action: "request_customer_changes" }
      )
    ).resolves.toEqual({
      ok: false,
      error: "Production actions are unavailable after an order has shipped.",
      status: 409
    });
  });

  it("blocks both production and shipping when customer artwork changes are requested", async () => {
    const rows = [fulfillmentOrder({ production_status: "completed", shipping_status: "ready_to_ship" })];

    const result = await applyAdminOrderProductionActionWithClient(
      createOrdersMemoryClient(rows),
      "order-123",
      { action: "request_customer_changes", note: "Logo needs replacement." }
    );

    expect(result).toMatchObject({
      ok: true,
      order: { production_status: "blocked", shipping_status: "blocked" }
    });
    expect(rows[0]).toMatchObject({ production_status: "blocked", shipping_status: "blocked" });
  });

  it("reports missing orders without issuing fulfillment writes", async () => {
    await expect(
      updateOrderFulfillmentWithClient(createOrdersMemoryClient([]), "missing-order", {
        productionStatus: "not_started",
        shippingStatus: "not_shipped",
        shippingMethod: "",
        shippingCarrier: "",
        trackingNumber: "",
        trackingUrl: "",
        internalNotes: "",
        adminFulfillmentNotes: "",
        markShipped: false
      })
    ).resolves.toEqual({ ok: false, error: "Order was not found.", status: 404 });
  });

  it("clears fulfillment text fields with intentional empty strings", async () => {
    const rows = [fulfillmentOrder({
      shipping_method: "Ground",
      shipping_carrier: "USPS",
      tracking_number: "TRACK123",
      tracking_url: "https://example.com/track/TRACK123",
      internal_notes: "Internal",
      admin_fulfillment_notes: "Admin"
    })];
    const client = createOrdersMemoryClient(rows);

    const result = await updateOrderFulfillmentWithClient(client, "order-123", {
      productionStatus: "not_started",
      shippingStatus: "not_shipped",
      shippingMethod: "",
      shippingCarrier: "",
      trackingNumber: "",
      trackingUrl: "",
      internalNotes: "",
      adminFulfillmentNotes: "",
      markShipped: false
    });

    expect(result).toEqual({ ok: true });
    expect(rows[0]).toMatchObject({
      shipping_method: "",
      shipping_carrier: "",
      tracking_number: "",
      tracking_url: "",
      internal_notes: "",
      admin_fulfillment_notes: ""
    });
  });

  it("allows empty tracking URL but rejects invalid non-empty tracking URL", () => {
    expect(orderFulfillmentUpdateSchema.safeParse({
      productionStatus: "not_started",
      shippingStatus: "not_shipped",
      shippingMethod: "",
      shippingCarrier: "",
      trackingNumber: "",
      trackingUrl: "",
      internalNotes: "",
      adminFulfillmentNotes: "",
      markShipped: false
    }).success).toBe(true);

    expect(orderFulfillmentUpdateSchema.safeParse({
      productionStatus: "not_started",
      shippingStatus: "not_shipped",
      shippingMethod: "",
      shippingCarrier: "",
      trackingNumber: "",
      trackingUrl: "not-a-url",
      internalNotes: "",
      adminFulfillmentNotes: "",
      markShipped: false
    }).success).toBe(false);
  });

  it("upserts paid orders by Stripe checkout session id", async () => {
    const upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    });
    const client = {
      from(table: string) {
        expect(table).toBe("orders");
        return { upsert };
      }
    } as unknown as OrdersDbClient;

    const result = await savePaidOrderFromCheckoutSessionWithClient(client, {
      id: "cs_test_123",
      payment_intent: "pi_test_123",
      payment_status: "paid",
      amount_subtotal: 4900,
      amount_total: 4900,
      currency: "usd",
      customer_details: { email: "buyer@example.com" },
      metadata: { order_items: "[]" }
    });

    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ stripe_checkout_session_id: "cs_test_123" }), {
      onConflict: "stripe_checkout_session_id"
    });
  });

  it("reports when a Stripe Checkout Session was already paid to avoid duplicate emails", async () => {
    const upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    });
    const client = {
      from(table: string) {
        expect(table).toBe("orders");
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      stripe_checkout_session_id: "cs_test_123",
                      status: "paid",
                      payment_status: "paid",
                      subtotal_cents: 3900,
                      total_cents: 3900,
                      currency: "usd",
                      line_items_json: [
                        {
                          productId: "google-review-stand",
                          optionId: "standard_direct",
                          optionLabel: "Standard Direct Stand",
                          title: "Google Review Stand",
                          sku: "GRS",
                          quantity: 1,
                          unitAmountCents: 3900,
                          lineSubtotalCents: 3900,
                          setup: {
                            hostedPageUrl: "https://taprater.com/p/EXISTING123",
                            generatedQrValue: "https://taprater.com/p/EXISTING123"
                          }
                        }
                      ]
                    },
                    error: null
                  })
                };
              }
            };
          },
          upsert
        };
      }
    } as unknown as OrdersDbClient;

    const result = await savePaidOrderFromCheckoutSessionWithClient(client, {
      id: "cs_test_123",
      payment_intent: "pi_test_123",
      payment_status: "paid",
      amount_subtotal: 3900,
      amount_total: 3900,
      currency: "usd",
      customer_details: { email: "buyer@example.com" },
      metadata: {
        order_items: JSON.stringify([
          {
            productId: "google-review-stand",
            optionId: "standard_direct",
            optionLabel: "Standard Direct Stand",
            title: "Google Review Stand",
            sku: "GRS",
            quantity: 1,
            unitAmountCents: 3900,
            lineSubtotalCents: 3900,
            setup: { generatedQrValue: "https://taprater.com/p/your-page" }
          }
        ])
      }
    });

    expect(result).toMatchObject({
      ok: true,
      wasAlreadyPaid: true,
      order: {
        line_items_json: [
          expect.objectContaining({
            productId: "google-review-stand",
            optionId: "standard_direct",
            setup: expect.objectContaining({
              hostedPageUrl: "https://taprater.com/p/EXISTING123",
              generatedQrValue: "https://taprater.com/p/EXISTING123"
            })
          })
        ]
      }
    });
  });
});

function fulfillmentOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-123",
    stripe_checkout_session_id: "cs_test_fulfillment",
    status: "paid",
    payment_status: "paid",
    email: "buyer@example.com",
    customer_name: "Buyer",
    subtotal_cents: 3900,
    total_cents: 3900,
    currency: "usd",
    line_items_json: [],
    shipping_amount_cents: 0,
    production_status: "not_started",
    shipping_status: "not_shipped",
    shipping_method: "",
    shipping_carrier: "",
    tracking_number: "",
    tracking_url: "",
    internal_notes: "",
    admin_fulfillment_notes: "",
    ...overrides
  };
}

function createOrdersMemoryClient(rows: Record<string, any>[]): OrdersDbClient {
  return {
    from(table: string) {
      expect(table).toBe("orders");
      return new OrdersMemoryQuery(rows);
    }
  } as unknown as OrdersDbClient;
}

class OrdersMemoryQuery {
  private filters: Array<{ column: string; value: unknown }> = [];
  private updatePayload: Record<string, unknown> | null = null;

  constructor(private readonly rows: Record<string, any>[]) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.updatePayload = payload;
    return this;
  }

  async maybeSingle() {
    const row = this.rows.find((candidate) => this.filters.every((filter) => candidate[filter.column] === filter.value));
    return { data: row ?? null, error: null };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    if (this.updatePayload) {
      this.rows
        .filter((candidate) => this.filters.every((filter) => candidate[filter.column] === filter.value))
        .forEach((candidate) => Object.assign(candidate, this.updatePayload));
    }
    return { data: null, error: null };
  }
}
