import type { OrderFulfillmentUpdateInput } from "@/lib/validators";

export function createOrderFulfillmentPayload(form: OrderFulfillmentUpdateInput): OrderFulfillmentUpdateInput {
  return {
    productionStatus: form.productionStatus,
    shippingStatus: form.shippingStatus,
    shippingMethod: form.shippingMethod ?? "",
    shippingCarrier: form.shippingCarrier ?? "",
    trackingNumber: form.trackingNumber ?? "",
    trackingUrl: form.trackingUrl ?? "",
    internalNotes: form.internalNotes ?? "",
    adminFulfillmentNotes: form.adminFulfillmentNotes ?? "",
    markShipped: form.markShipped ?? false
  };
}
