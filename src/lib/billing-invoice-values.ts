import type { StripeInvoiceLike } from "./billing-invoices";

export function readInvoiceTaxCents(invoice: StripeInvoiceLike) {
  if (typeof invoice.tax === "number" && Number.isFinite(invoice.tax)) return invoice.tax;
  const taxes = Array.isArray(invoice.total_taxes) ? invoice.total_taxes : invoice.total_tax_amounts;
  return Array.isArray(taxes) ? taxes.reduce((total, row) => total + (readNumber(row.amount) ?? 0), 0) : 0;
}

export function readStripeInvoiceSubscriptionId(invoice: StripeInvoiceLike) {
  return readStripeId(invoice.subscription) ?? readStripeId(invoice.parent?.subscription_details?.subscription);
}

export function readPaymentMethodLabel(details: Record<string, unknown>) {
  const method = readRecord(details.payment_method_details);
  const type = readString(method.type);
  const brand = readString(method.brand);
  const last4 = readString(method.last4);
  if (type === "card" || brand || last4) return [brand ? capitalize(brand) : "Card", last4 ? `ending ${last4}` : undefined].filter(Boolean).join(" ");
  if (type === "paypal") return "PayPal";
  return type ? capitalize(type.replaceAll("_", " ")) : null;
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readStripeId(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") return readString((value as Record<string, unknown>).id);
  return undefined;
}

export function readStripeCustomerEmail(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  return readString((value as Record<string, unknown>).email);
}

export function toIso(epochSeconds: unknown) {
  return typeof epochSeconds === "number" && Number.isFinite(epochSeconds) ? new Date(epochSeconds * 1000).toISOString() : null;
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
