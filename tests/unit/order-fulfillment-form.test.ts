import { describe, expect, it } from "vitest";
import { createOrderFulfillmentPayload } from "@/lib/order-fulfillment-payload";

describe("order fulfillment form payload", () => {
  it("includes intentional empty strings for clearable fulfillment fields", () => {
    expect(createOrderFulfillmentPayload({
      productionStatus: "not_started",
      shippingStatus: "not_shipped",
      shippingMethod: "",
      shippingCarrier: "",
      trackingNumber: "",
      trackingUrl: "",
      internalNotes: "",
      adminFulfillmentNotes: "",
      markShipped: false
    })).toEqual({
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
  });
});
