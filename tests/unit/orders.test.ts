import { describe, expect, it, vi } from "vitest";
import {
  mapCheckoutRowsToOrderLineItems,
  mapCheckoutSessionToOrderInput,
  savePaidOrderFromCheckoutSessionWithClient,
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
