import { describe, expect, it } from "vitest";
import { buildDamagedStandReplacement } from "@/lib/replacement-orders";

describe("buildDamagedStandReplacement", () => {
  it("copies the approved stand setup but clears money, shipment, and stand identity", () => {
    const replacement = buildDamagedStandReplacement({ id: "40e62115-4c56-4890-8a8c-d4105be57289", stripe_checkout_session_id: "cs_original", status: "paid", payment_status: "paid", email: "buyer@example.com", customer_name: "Buyer", subtotal_cents: 4900, total_cents: 4900, currency: "usd", shipping_amount_cents: 0, shipping_address_json: { address: { line1: "1 Main" } }, customer_details_json: { phone: "555" }, production_status: "completed", shipping_status: "delivered", internal_notes: "", admin_fulfillment_notes: "", line_items_json: [{ productId: "google-review-stand", title: "Custom stand", sku: "TR-1", quantity: 1, unitAmountCents: 4900, lineSubtotalCents: 4900, standLineId: "old-line", proofApproved: true, setup: { destinationUrl: "https://example.com", logoStorageKey: "logos/a.png" } }] }, "9a0b0790-6c98-4d9d-923a-d6ca0c2e6883");
    expect(replacement).toMatchObject({ status: "paid", payment_status: "complimentary", total_cents: 0, production_status: "ready_for_production", shipping_status: "not_shipped" });
    expect(replacement.customer_details_json).toMatchObject({ replacement_of_order_id: "40e62115-4c56-4890-8a8c-d4105be57289", complimentary_order_type: "Replacement" });
    expect(replacement.line_items_json[0]).toMatchObject({ unitAmountCents: 0, lineSubtotalCents: 0, setup: { destinationUrl: "https://example.com", logoStorageKey: "logos/a.png" } });
    expect(replacement.line_items_json[0].standLineId).toBeUndefined();
  });
});
