import type { ManualProductionWarningCode } from "@/lib/checkout";
import type { CheckoutShippingAddressInput } from "@/lib/validators";
import type { OrderRecord, ProductionStatus, ShippingStatus, StripeCheckoutSessionLike } from "./order-types";

export function normalizeProductionWarningCodes(
  current: ManualProductionWarningCode[] | undefined,
  required: ManualProductionWarningCode[] = []
): ManualProductionWarningCode[] {
  const currentCodes = Array.isArray(current) ? current.filter(isManualProductionWarningCode) : [];
  return Array.from(new Set([...currentCodes, ...required]));
}

export function isManualProductionWarningCode(value: unknown): value is ManualProductionWarningCode {
  return (
    value === "pending_manual_proof" ||
    value === "asset_storage_not_configured" ||
    value === "artwork_generation_failed" ||
    value === "do_not_print_until_manual_review"
  );
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function readSetupString(setup: Record<string, unknown> | undefined, key: string) {
  if (!setup || typeof setup !== "object") {
    return undefined;
  }

  return readString(setup[key]);
}

export function readProofPreviewString(setup: Record<string, unknown> | undefined, key: string) {
  const proofPreviewData = setup?.proofPreviewData;
  if (!proofPreviewData || typeof proofPreviewData !== "object") {
    return undefined;
  }

  return readString((proofPreviewData as Record<string, unknown>)[key]);
}

export function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readIntegerString(value: unknown) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return undefined;
  }

  return Number(value);
}

export function readOrderStatus(value: unknown): OrderRecord["status"] | undefined {
  return value === "pending_payment" || value === "paid" || value === "failed" || value === "canceled" ? value : undefined;
}

export function readProductionStatus(value: unknown): ProductionStatus | undefined {
  return value === "not_started" || value === "ready_for_production" || value === "in_production" || value === "blocked" || value === "completed"
    ? value
    : undefined;
}

export function readShippingStatus(value: unknown): ShippingStatus | undefined {
  return value === "not_shipped" || value === "ready_to_ship" || value === "shipped" || value === "delivered" || value === "blocked" ? value : undefined;
}

export function readShippingMode(value: unknown): "manual" | "free" | "flat" | undefined {
  return value === "manual" || value === "free" || value === "flat" ? value : undefined;
}

export function readStripeObjectId(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const id = (value as Record<string, unknown>).id;
    return typeof id === "string" && id.trim() ? id : null;
  }
  return null;
}

export function readInvoiceDetails(invoice: StripeCheckoutSessionLike["invoice"]) {
  if (!invoice || typeof invoice === "string") {
    return {
      invoiceId: typeof invoice === "string" ? invoice : undefined,
      hostedInvoiceUrl: undefined,
      invoicePdfUrl: undefined,
      invoiceNumber: undefined
    };
  }

  return {
    invoiceId: typeof invoice.id === "string" ? invoice.id : undefined,
    hostedInvoiceUrl: typeof invoice.hosted_invoice_url === "string" ? invoice.hosted_invoice_url : undefined,
    invoicePdfUrl: typeof invoice.invoice_pdf === "string" ? invoice.invoice_pdf : undefined,
    invoiceNumber: typeof invoice.number === "string" ? invoice.number : undefined
  };
}

export function normalizeShippingAddress(
  shippingDetails: StripeCheckoutSessionLike["shipping_details"],
  customerDetails: StripeCheckoutSessionLike["customer_details"]
): Record<string, unknown> | null {
  const address = shippingDetails?.address ?? customerDetails?.address;
  if (!address || typeof address !== "object") {
    return null;
  }

  return {
    name: shippingDetails?.name ?? customerDetails?.name ?? null,
    phone: shippingDetails?.phone ?? customerDetails?.phone ?? null,
    address
  };
}

export function normalizePrePaymentShippingAddress(shippingAddress: CheckoutShippingAddressInput): Record<string, unknown> {
  return {
    name: shippingAddress.name,
    phone: shippingAddress.phone || null,
    address: {
      line1: shippingAddress.line1,
      line2: shippingAddress.line2 || null,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.postalCode,
      country: shippingAddress.country
    },
    source: "checkout_before_payment"
  };
}

export function mergeOrderDetails(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!existing && !incoming) return null;
  return {
    ...(existing ?? {}),
    ...(incoming ?? {})
  };
}
