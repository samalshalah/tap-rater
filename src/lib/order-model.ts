import type { CheckoutCartRow, ManualProductionWarningCode } from "@/lib/checkout";
import type { CheckoutShippingAddressInput } from "@/lib/validators";
import type { OrderLineItem, OrderLineItemFulfillmentKind, OrderLineItemProductionSummary, OrderRecord, ProductionStatus, ShippingStatus, StripeCheckoutSessionLike } from "./order-types";
import { normalizeProductionWarningCodes, isManualProductionWarningCode, readString, readSetupString, readProofPreviewString, readNumber, readIntegerString, readOrderStatus, readProductionStatus, readShippingStatus, readShippingMode, readStripeObjectId, readInvoiceDetails, normalizeShippingAddress, normalizePrePaymentShippingAddress, mergeOrderDetails } from "./order-value-readers";
import { applyOrderLineItemFulfillmentInference, getOrderLineItemFulfillmentKind, getOrderLineItemProductionSummary, getOrderProductionBlockers, inferOrderProductionStatus } from "./order-production-rules";
export { normalizeProductionWarningCodes, isManualProductionWarningCode, readString, readSetupString, readProofPreviewString, readNumber, readIntegerString, readOrderStatus, readProductionStatus, readShippingStatus, readShippingMode, readStripeObjectId, readInvoiceDetails, normalizeShippingAddress, normalizePrePaymentShippingAddress, mergeOrderDetails } from "./order-value-readers";
export { applyOrderLineItemFulfillmentInference, getOrderLineItemFulfillmentKind, getOrderLineItemProductionSummary, getOrderProductionBlockers, inferOrderProductionStatus } from "./order-production-rules";

export function mapCheckoutRowsToOrderLineItems(rows: CheckoutCartRow[]): OrderLineItem[] {
  return rows.map((row) =>
    applyOrderLineItemFulfillmentInference({
      productId: row.productId,
      optionId: row.optionId,
      optionLabel: row.optionLabel,
      destinationMode: row.destinationMode,
      customizationLevel: row.customizationLevel,
      title: row.title,
      baseSku: row.baseSku,
      sku: row.sku,
      quantity: row.quantity,
      unitAmountCents: row.unitAmountCents,
      monthlyAmountCents: row.monthlyAmountCents,
      lineSubtotalCents: row.lineSubtotalCents,
      discountCents: row.discountCents,
      offerId: row.offerId,
      offerLabel: row.offerLabel,
      setup: Object.fromEntries(Object.entries(row.setup ?? {}).filter(([key]) => key !== "productionArtwork")),
      logoRequired: row.logoRequired,
      logoStatus: row.logoStatus,
      logoReference: row.logoReference ?? null,
      proofRequired: row.proofRequired,
      proofApproved: row.proofApproved,
      productionStatus: row.productionStatus,
      manualProductionRequired: row.manualProductionRequired,
      productionWarningCodes: row.productionWarningCodes
    })
  );
}

export function mapCheckoutSessionToOrderInput(session: StripeCheckoutSessionLike): OrderRecord {
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const stripeCustomerId = readStripeObjectId(session.customer);
  const invoiceDetails = readInvoiceDetails(session.invoice);
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const lineItems = parseOrderLineItems(session.metadata?.order_items);
  const shippingDetails = session.shipping_details ?? session.collected_information?.shipping_details ?? null;
  const shippingAddress = normalizeShippingAddress(shippingDetails, session.customer_details);
  const configuredSubtotalCents = readIntegerString(session.metadata?.total_cents);
  const taxAmountCents = readIntegerString(session.metadata?.tax_amount_cents) ?? 0;

  return {
    stripe_checkout_session_id: session.id ?? "",
    stripe_payment_intent_id: paymentIntent,
    status: session.payment_status === "paid" ? "paid" : "pending_payment",
    payment_status: session.payment_status ?? null,
    email,
    customer_name: session.customer_details?.name ?? null,
    subtotal_cents: configuredSubtotalCents ?? session.amount_subtotal ?? 0,
    total_cents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    line_items_json: lineItems,
    customer_details_json: {
      ...(session.customer_details ?? {}),
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
      ...(invoiceDetails.invoiceId ? { invoice_id: invoiceDetails.invoiceId } : {}),
      ...(invoiceDetails.hostedInvoiceUrl ? { hosted_invoice_url: invoiceDetails.hostedInvoiceUrl } : {}),
      ...(invoiceDetails.invoicePdfUrl ? { invoice_pdf_url: invoiceDetails.invoicePdfUrl } : {}),
      ...(invoiceDetails.invoiceNumber ? { invoice_number: invoiceDetails.invoiceNumber } : {}),
      tax_summary: {
        mode: session.metadata?.tax_mode ?? "unknown",
        label: session.metadata?.tax_label ?? "Sales tax",
        rate_bps: readIntegerString(session.metadata?.tax_rate_bps) ?? 0,
        amount_cents: taxAmountCents,
        tax_shipping: session.metadata?.tax_shipping === "true"
      }
    },
    shipping_address_json: shippingAddress,
    shipping_amount_cents: session.shipping_cost?.amount_total ?? readIntegerString(session.metadata?.shipping_amount_cents) ?? 0,
    shipping_mode: readShippingMode(session.metadata?.shipping_mode) ?? null,
    production_status: "not_started",
    shipping_status: "not_shipped",
    shipping_method: null,
    shipping_carrier: null,
    tracking_number: null,
    tracking_url: null,
    shipped_at: null,
    internal_notes: "",
    admin_fulfillment_notes: "",
    updated_at: new Date().toISOString()
  };
}

export function parseOrderLineItems(value: string | null | undefined): OrderLineItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }

          const row = item as Partial<OrderLineItem>;
          return typeof row.productId === "string" &&
            typeof row.title === "string" &&
            typeof row.sku === "string" &&
            Number.isInteger(row.quantity) &&
            Number.isInteger(row.unitAmountCents) &&
            Number.isInteger(row.lineSubtotalCents)
            ? [
                applyOrderLineItemFulfillmentInference({
                  ...row,
                  setup: row.setup && typeof row.setup === "object" ? row.setup : undefined
                } as OrderLineItem)
              ]
            : [];
        })
      : [];
  } catch {
    return [];
  }
}

export function normalizeOrderRecord(value: unknown): OrderRecord {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: readString(row.id),
    stripe_checkout_session_id: readString(row.stripe_checkout_session_id) ?? "",
    stripe_payment_intent_id: readString(row.stripe_payment_intent_id) ?? null,
    stripe_refund_id: readString(row.stripe_refund_id) ?? null,
    refunded_at: readString(row.refunded_at) ?? null,
    refund_status: readString(row.refund_status) ?? null,
    refunded_amount_cents: readNumber(row.refunded_amount_cents) ?? 0,
    refund_pending_amount_cents: readNumber(row.refund_pending_amount_cents) ?? 0,
    refund_failure_reason: readString(row.refund_failure_reason) ?? null,
    status: readOrderStatus(row.status) ?? "pending_payment",
    payment_status: readString(row.payment_status) ?? null,
    email: readString(row.email) ?? null,
    customer_name: readString(row.customer_name) ?? null,
    subtotal_cents: readNumber(row.subtotal_cents) ?? 0,
    total_cents: readNumber(row.total_cents) ?? 0,
    currency: readString(row.currency) ?? "usd",
    line_items_json: Array.isArray(row.line_items_json)
      ? (row.line_items_json as OrderLineItem[]).map(applyOrderLineItemFulfillmentInference)
      : [],
    customer_details_json: row.customer_details_json && typeof row.customer_details_json === "object" ? (row.customer_details_json as Record<string, unknown>) : null,
    shipping_address_json: row.shipping_address_json && typeof row.shipping_address_json === "object" ? (row.shipping_address_json as Record<string, unknown>) : null,
    shipping_amount_cents: readNumber(row.shipping_amount_cents) ?? 0,
    shipping_mode: readShippingMode(row.shipping_mode) ?? null,
    production_status: readProductionStatus(row.production_status) ?? "not_started",
    shipping_status: readShippingStatus(row.shipping_status) ?? "not_shipped",
    shipping_method: readString(row.shipping_method) ?? null,
    shipping_carrier: readString(row.shipping_carrier) ?? null,
    tracking_number: readString(row.tracking_number) ?? null,
    tracking_url: readString(row.tracking_url) ?? null,
    shipped_at: readString(row.shipped_at) ?? null,
    internal_notes: readString(row.internal_notes) ?? "",
    admin_fulfillment_notes: readString(row.admin_fulfillment_notes) ?? "",
    created_at: readString(row.created_at),
    updated_at: readString(row.updated_at)
  };
}
