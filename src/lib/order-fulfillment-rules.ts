import type { OrderRecord, ShippingStatus } from "@/lib/orders";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";

export type OrderFulfillmentValidation =
  | { ok: true; shippingStatus: ShippingStatus; isFirstShippedTransition: boolean }
  | { ok: false; error: string; status: 409 };

export function canAdvanceOrderFulfillment(order: Pick<OrderRecord, "status" | "payment_status">) {
  return isOrderPaymentConfirmed(order.status, order.payment_status);
}

export function canRunOrderProductionActions(
  order: Pick<OrderRecord, "status" | "payment_status" | "shipping_status" | "shipped_at">
) {
  return (
    canAdvanceOrderFulfillment(order) &&
    !order.shipped_at &&
    order.shipping_status !== "shipped" &&
    order.shipping_status !== "delivered"
  );
}

export function isOrderPaymentConfirmed(status: OrderRecord["status"], paymentStatus?: string | null) {
  if (status === "canceled" || status === "failed" || paymentStatus === "refunded") {
    return false;
  }
  return paymentStatus === "paid" || status === "paid";
}

export function validateOrderFulfillmentTransition(
  order: Pick<OrderRecord, "status" | "payment_status" | "production_status" | "shipping_status">,
  input: OrderFulfillmentUpdateInput
): OrderFulfillmentValidation {
  const shippingStatus = input.markShipped ? "shipped" : input.shippingStatus;
  const stateChanged = input.productionStatus !== order.production_status || shippingStatus !== order.shipping_status;

  if (stateChanged && !canAdvanceOrderFulfillment(order)) {
    return { ok: false, error: "Fulfillment cannot advance until payment is confirmed.", status: 409 };
  }

  if (["ready_to_ship", "shipped", "delivered"].includes(shippingStatus) && input.productionStatus !== "completed") {
    return { ok: false, error: "Complete production before advancing shipping.", status: 409 };
  }

  if (order.shipping_status === "delivered" && shippingStatus !== "delivered") {
    return { ok: false, error: "Delivered orders cannot move back to an earlier shipping state.", status: 409 };
  }

  if (
    order.shipping_status === "shipped" &&
    shippingStatus !== "shipped" &&
    shippingStatus !== "delivered" &&
    shippingStatus !== "blocked"
  ) {
    return { ok: false, error: "Shipped orders cannot move back to a pre-shipment state.", status: 409 };
  }

  if (shippingStatus === "delivered" && order.shipping_status !== "shipped" && order.shipping_status !== "delivered") {
    return { ok: false, error: "Mark the order shipped before marking it delivered.", status: 409 };
  }

  return {
    ok: true,
    shippingStatus,
    isFirstShippedTransition:
      shippingStatus === "shipped" && order.shipping_status !== "shipped" && order.shipping_status !== "delivered"
  };
}
