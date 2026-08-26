import { describe, expect, it } from "vitest";
import { createAdminOrderActionPayload, type AdminOrderActionSource } from "@/lib/admin-order-actions";

const order: AdminOrderActionSource = {
  productionStatus: "not_started",
  shippingStatus: "not_shipped",
  shippingMethod: "Ground",
  shippingCarrier: "USPS",
  trackingNumber: "TRACK123",
  trackingUrl: "https://example.com/track/TRACK123",
  internalNotes: "Internal",
  adminFulfillmentNotes: "Fulfillment"
};

describe("admin order actions", () => {
  it("marks orders ready to ship after production is completed", () => {
    expect(createAdminOrderActionPayload(order, "ready_to_ship")).toMatchObject({
      productionStatus: "completed",
      shippingStatus: "ready_to_ship",
      markShipped: false
    });
  });

  it("marks shipped orders with the shipped transition flag", () => {
    expect(createAdminOrderActionPayload(order, "mark_shipped")).toMatchObject({
      productionStatus: "completed",
      shippingStatus: "shipped",
      markShipped: true
    });
  });

  it("keeps existing fulfillment fields in quick action payloads", () => {
    expect(createAdminOrderActionPayload(order, "in_production")).toMatchObject({
      shippingMethod: "Ground",
      shippingCarrier: "USPS",
      trackingNumber: "TRACK123",
      trackingUrl: "https://example.com/track/TRACK123",
      internalNotes: "Internal",
      adminFulfillmentNotes: "Fulfillment"
    });
  });
});
