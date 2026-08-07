import { describe, expect, it, vi } from "vitest";
import {
  canMarkLineItemReadyForPrint,
  mapCheckoutRowsToOrderLineItems,
  mapCheckoutSessionToOrderInput,
  savePaidOrderFromCheckoutSessionWithClient,
  updateOrderLineItemWithClient,
  type OrdersDbClient
} from "@/lib/orders";

describe("orders repository", () => {
  it("preserves manual logo and proof status in order line items", () => {
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
          manualCollectionAcknowledged: true
        },
        logoRequired: true,
        logoStatus: "manual_collection_required",
        logoReference: null,
        proofRequired: true,
        proofApproved: false,
        productionStatus: "pending_manual_logo_and_proof"
      }
    ]);

    expect(items[0]).toMatchObject({
      optionLabel: "Branded + QR Direct Stand",
      logoRequired: true,
      logoStatus: "manual_collection_required",
      logoReference: null,
      proofRequired: true,
      proofApproved: false,
      productionStatus: "pending_manual_logo_and_proof"
    });
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
});

describe("canMarkLineItemReadyForPrint -- the print-readiness rule itself", () => {
  it("allows print-ready when nothing is required (the free/basic tier)", () => {
    expect(canMarkLineItemReadyForPrint({ logoRequired: false, proofRequired: false })).toBe(true);
  });

  it("blocks print-ready when a logo is required but not yet recorded", () => {
    expect(canMarkLineItemReadyForPrint({ logoRequired: true, logoReference: null, proofRequired: false })).toBe(false);
    expect(canMarkLineItemReadyForPrint({ logoRequired: true, logoReference: "", proofRequired: false })).toBe(false);
    expect(canMarkLineItemReadyForPrint({ logoRequired: true, logoReference: "   ", proofRequired: false })).toBe(false);
  });

  it("allows print-ready once a logo reference is actually recorded", () => {
    expect(canMarkLineItemReadyForPrint({ logoRequired: true, logoReference: "received via email", proofRequired: false })).toBe(true);
  });

  it("blocks print-ready when proof is required but not approved", () => {
    expect(canMarkLineItemReadyForPrint({ logoRequired: false, proofRequired: true, proofApproved: false })).toBe(false);
    expect(canMarkLineItemReadyForPrint({ logoRequired: false, proofRequired: true, proofApproved: undefined })).toBe(false);
  });

  it("requires BOTH conditions when both are required (branded/custom tiers)", () => {
    expect(
      canMarkLineItemReadyForPrint({ logoRequired: true, logoReference: "logo.png", proofRequired: true, proofApproved: false })
    ).toBe(false);
    expect(
      canMarkLineItemReadyForPrint({ logoRequired: true, logoReference: null, proofRequired: true, proofApproved: true })
    ).toBe(false);
    expect(
      canMarkLineItemReadyForPrint({ logoRequired: true, logoReference: "logo.png", proofRequired: true, proofApproved: true })
    ).toBe(true);
  });
});

describe("updateOrderLineItemWithClient -- server-side enforcement, not just UI gating", () => {
  function mockOrderClient(existingLineItem: Record<string, unknown>) {
    const updateFn = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from(table: string) {
        expect(table).toBe("orders");
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    stripe_checkout_session_id: "cs_test_123",
                    status: "paid",
                    subtotal_cents: 4900,
                    total_cents: 4900,
                    currency: "usd",
                    line_items_json: [existingLineItem]
                  },
                  error: null
                })
            })
          }),
          update: (payload: unknown) => {
            updateFn(payload);
            return { eq: () => Promise.resolve({ error: null }) };
          }
        };
      }
    } as unknown as OrdersDbClient;

    return { client, updateFn };
  }

  it("rejects marking ready for print when the request tries to skip a required logo, even though the client asked for it", async () => {
    const { client, updateFn } = mockOrderClient({
      productId: "google-review-stand-branded-qr",
      title: "Google Review Stand - Branded + QR",
      sku: "TR-GOOGLE-STAND-BQR",
      quantity: 1,
      unitAmountCents: 4900,
      lineSubtotalCents: 4900,
      logoRequired: true,
      logoReference: null,
      proofRequired: true,
      proofApproved: true
    });

    const result = await updateOrderLineItemWithClient(client, {
      stripeCheckoutSessionId: "cs_test_123",
      lineItemIndex: 0,
      readyForPrint: true
      // Note: NOT providing a logoReference in this request -- the stored
      // logoReference is still null. This must be rejected even though
      // proofApproved is already true.
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/logo\/proof/i);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("allows marking ready for print in the SAME request that supplies the missing logo reference", async () => {
    const { client, updateFn } = mockOrderClient({
      productId: "google-review-stand-branded-qr",
      title: "Google Review Stand - Branded + QR",
      sku: "TR-GOOGLE-STAND-BQR",
      quantity: 1,
      unitAmountCents: 4900,
      lineSubtotalCents: 4900,
      logoRequired: true,
      logoReference: null,
      proofRequired: true,
      proofApproved: true
    });

    const result = await updateOrderLineItemWithClient(client, {
      stripeCheckoutSessionId: "cs_test_123",
      lineItemIndex: 0,
      logoReference: "received via email, saved as google-nova-logo.png",
      readyForPrint: true
    });

    expect(result.ok).toBe(true);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items_json: expect.arrayContaining([
          expect.objectContaining({
            logoReference: "received via email, saved as google-nova-logo.png",
            readyForPrint: true
          })
        ])
      })
    );
  });

  it("allows simply recording a logo reference or proof approval without also setting readyForPrint", async () => {
    const { client, updateFn } = mockOrderClient({
      productId: "custom-direct-stand",
      title: "Custom Direct Stand",
      sku: "TR-CUSTOM-STAND",
      quantity: 1,
      unitAmountCents: 4900,
      lineSubtotalCents: 4900,
      logoRequired: true,
      logoReference: null,
      proofRequired: true,
      proofApproved: false
    });

    const result = await updateOrderLineItemWithClient(client, {
      stripeCheckoutSessionId: "cs_test_123",
      lineItemIndex: 0,
      proofApproved: true
      // readyForPrint intentionally omitted
    });

    expect(result.ok).toBe(true);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items_json: expect.arrayContaining([expect.objectContaining({ proofApproved: true, readyForPrint: undefined })])
      })
    );
  });

  it("returns an error for a line item index that doesn't exist on the order", async () => {
    const { client } = mockOrderClient({ productId: "google-review-stand", title: "Google Review Stand", sku: "TR-GOOGLE-STAND", quantity: 1, unitAmountCents: 3900, lineSubtotalCents: 3900 });

    const result = await updateOrderLineItemWithClient(client, {
      stripeCheckoutSessionId: "cs_test_123",
      lineItemIndex: 5,
      readyForPrint: true
    });

    expect(result.ok).toBe(false);
  });
});
