import type { OrderFulfillmentUpdateInput } from "@/lib/validators";

export type AdminOrderAction =
  | "ready_for_production"
  | "in_production"
  | "ready_to_ship"
  | "mark_shipped"
  | "mark_delivered"
  | "block_order";

export type AdminOrderActionSource = {
  productionStatus: OrderFulfillmentUpdateInput["productionStatus"];
  shippingStatus: OrderFulfillmentUpdateInput["shippingStatus"];
  shippingMethod: string;
  shippingCarrier: string;
  trackingNumber: string;
  trackingUrl: string;
  internalNotes: string;
  adminFulfillmentNotes: string;
};

export function createAdminOrderActionPayload(
  order: AdminOrderActionSource,
  action: AdminOrderAction
): OrderFulfillmentUpdateInput {
  const base: OrderFulfillmentUpdateInput = {
    productionStatus: order.productionStatus,
    shippingStatus: order.shippingStatus,
    shippingMethod: order.shippingMethod,
    shippingCarrier: order.shippingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    internalNotes: order.internalNotes,
    adminFulfillmentNotes: order.adminFulfillmentNotes,
    markShipped: false
  };

  if (action === "ready_for_production") {
    return { ...base, productionStatus: "ready_for_production" };
  }

  if (action === "in_production") {
    return { ...base, productionStatus: "in_production" };
  }

  if (action === "ready_to_ship") {
    return { ...base, productionStatus: "completed", shippingStatus: "ready_to_ship" };
  }

  if (action === "mark_shipped") {
    return { ...base, productionStatus: "completed", shippingStatus: "shipped", markShipped: true };
  }

  if (action === "mark_delivered") {
    return { ...base, productionStatus: "completed", shippingStatus: "delivered" };
  }

  return { ...base, productionStatus: "blocked", shippingStatus: "blocked" };
}
