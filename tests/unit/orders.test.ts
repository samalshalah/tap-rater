import { describe, expect, it, vi } from "vitest";
import {
  applyOrderLineItemFulfillmentInference,
  getOrderLineItemFulfillmentKind,
  getOrderLineItemProductionSummary,
  mapCheckoutRowsToOrderLineItems,
  mapCheckoutSessionToOrderInput,
  savePaidOrderFromCheckoutSessionWithClient,
  updateOrderFulfillmentWithClient,
  type OrdersDbClient
} from "@/lib/orders";
import { orderFulfillmentUpdateSchema } from "@/lib/validators";

describe("orders repository", () => {
  it("preserves uploaded logo and branded proof status in order line items", () => {
    const items = mapCheckoutRowsToOrderLineItems([
      {
        productId: "google-review-stand",
        optionId: "branded_qr_direct",
        optionLabel: "Branded + QR Direct Stand",
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
      productionStatus: "ready_for_direct_activation",
      manualProductionRequired: false,
      productionWarningCodes: []
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
      nfcBehavior: "NFC only",
      printedQrLabel: "No printed QR",
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
        frontTemplateUrl: "/api/media/product/products/google-review/front-template.png"
      },
      logoReference: "products/customer-setup/logo.png",
      proofApproved: true
    });

    expect(summary).toMatchObject({
      fulfillmentKind: "branded",
      optionLabel: "Branded + QR Direct",
      nfcBehavior: "NFC + printed QR",
      printedQrLabel: "Printed QR included",
      businessName: "Nova Implant",
      logoReference: "products/customer-setup/logo.png",
      generatedQrValue: "https://g.page/example/review",
      frontTemplateUrl: "/api/media/product/products/google-review/front-template.png",
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
      "Missing QR value",
      "Proof not confirmed"
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
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    const client = {
      from(table: string) {
        expect(table).toBe("orders");
        return { update };
      }
    } as unknown as OrdersDbClient;

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
    });

    expect(result).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      production_status: "completed",
      shipping_status: "shipped",
      shipping_method: "Ground",
      shipping_carrier: "USPS",
      tracking_number: "TRACK123",
      tracking_url: "https://example.com/track/TRACK123",
      internal_notes: "Packed carefully.",
      admin_fulfillment_notes: "Ready.",
      shipped_at: expect.any(String)
    }));
  });

  it("clears fulfillment text fields with intentional empty strings", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });
    const client = {
      from(table: string) {
        expect(table).toBe("orders");
        return { update };
      }
    } as unknown as OrdersDbClient;

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
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      shipping_method: "",
      shipping_carrier: "",
      tracking_number: "",
      tracking_url: "",
      internal_notes: "",
      admin_fulfillment_notes: ""
    }));
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
    const upsert = vi.fn().mockResolvedValue({ error: null });
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
    const upsert = vi.fn().mockResolvedValue({ error: null });
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
                          lineSubtotalCents: 3900
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
      metadata: { order_items: "[]" }
    });

    expect(result).toMatchObject({
      ok: true,
      wasAlreadyPaid: true,
      order: {
        line_items_json: [
          expect.objectContaining({
            productId: "google-review-stand",
            optionId: "standard_direct"
          })
        ]
      }
    });
  });
});
