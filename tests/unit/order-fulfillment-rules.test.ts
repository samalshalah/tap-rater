import { describe, expect, it } from "vitest";
import {
  canAdvanceOrderFulfillment,
  canRunOrderProductionActions,
  validateOrderFulfillmentTransition
} from "@/lib/order-fulfillment-rules";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";

const paidOrder = {
  status: "paid" as const,
  payment_status: "paid",
  production_status: "not_started" as const,
  shipping_status: "not_shipped" as const
};

const input: OrderFulfillmentUpdateInput = {
  productionStatus: "not_started",
  shippingStatus: "not_shipped",
  shippingMethod: "",
  shippingCarrier: "",
  trackingNumber: "",
  trackingUrl: "",
  internalNotes: "",
  adminFulfillmentNotes: "",
  markShipped: false
};

describe("order fulfillment rules", () => {
  it("treats refunded and unpaid orders as payment holds", () => {
    expect(canAdvanceOrderFulfillment({ status: "pending_payment", payment_status: "manual_unpaid" })).toBe(false);
    expect(canAdvanceOrderFulfillment({ status: "canceled", payment_status: "refunded" })).toBe(false);
    expect(canAdvanceOrderFulfillment({ status: "paid", payment_status: "paid" })).toBe(true);
  });

  it("stops production actions after shipment", () => {
    expect(canRunOrderProductionActions({ ...paidOrder, shipping_status: "ready_to_ship" })).toBe(true);
    expect(canRunOrderProductionActions({ ...paidOrder, shipping_status: "shipped" })).toBe(false);
    expect(canRunOrderProductionActions({ ...paidOrder, shipping_status: "delivered" })).toBe(false);
    expect(canRunOrderProductionActions({ ...paidOrder, shipping_status: "blocked", shipped_at: "2026-09-05T12:00:00.000Z" })).toBe(false);
  });

  it("allows notes-only saves on a payment hold", () => {
    expect(validateOrderFulfillmentTransition(
      {
        status: "pending_payment",
        payment_status: "manual_unpaid",
        production_status: "ready_for_production",
        shipping_status: "not_shipped"
      },
      { ...input, productionStatus: "ready_for_production", internalNotes: "Awaiting payment." }
    )).toMatchObject({ ok: true, shippingStatus: "not_shipped" });
  });

  it("blocks unpaid orders from advancing", () => {
    expect(validateOrderFulfillmentTransition(
      { ...paidOrder, status: "pending_payment", payment_status: "manual_unpaid" },
      { ...input, productionStatus: "ready_for_production" }
    )).toEqual({
      ok: false,
      error: "Fulfillment cannot advance until payment is confirmed.",
      status: 409
    });
  });

  it("requires completed production before shipping", () => {
    expect(validateOrderFulfillmentTransition(
      paidOrder,
      { ...input, shippingStatus: "ready_to_ship" }
    )).toEqual({
      ok: false,
      error: "Complete production before advancing shipping.",
      status: 409
    });
  });

  it("recognizes a direct shipped selection as the first shipped transition", () => {
    expect(validateOrderFulfillmentTransition(
      { ...paidOrder, production_status: "completed", shipping_status: "ready_to_ship" },
      { ...input, productionStatus: "completed", shippingStatus: "shipped" }
    )).toEqual({
      ok: true,
      shippingStatus: "shipped",
      isFirstShippedTransition: true
    });
  });

  it("requires shipped state before delivered", () => {
    expect(validateOrderFulfillmentTransition(
      { ...paidOrder, production_status: "completed", shipping_status: "ready_to_ship" },
      { ...input, productionStatus: "completed", shippingStatus: "delivered" }
    )).toEqual({
      ok: false,
      error: "Mark the order shipped before marking it delivered.",
      status: 409
    });
  });

  it("prevents backward shipping transitions", () => {
    expect(validateOrderFulfillmentTransition(
      { ...paidOrder, production_status: "completed", shipping_status: "delivered" },
      { ...input, productionStatus: "completed", shippingStatus: "ready_to_ship" }
    )).toEqual({
      ok: false,
      error: "Delivered orders cannot move back to an earlier shipping state.",
      status: 409
    });
  });
});
