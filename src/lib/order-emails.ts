import { getOrderFromEmail } from "@/lib/email";
import { getOrderReplyToEmail, type EmailResult, type SendEmailInput } from "@/lib/email";
import { createEmailIdempotencyKey } from "@/lib/email-deliveries";
import { sendCommerceEmail } from "@/lib/commerce-email-outbox";
import {
  defaultEmailTemplates,
  getEmailTemplate,
  renderEmailTemplateHtml,
  type EmailTemplateKey,
  type EmailTemplateSettings
} from "@/lib/email-templates";
import { formatOrderReference } from "@/lib/order-reference";
import { renderCustomerOrderEmail, safeEmailUrl } from "@/lib/customer-order-email-layout";
import {
  getOrderLineItemProductionSummary,
  getAdminOrderArtworkUrl,
  type OrderLineItem,
  type OrderRecord
} from "@/lib/orders";

type SendEmailFn = (input: SendEmailInput) => Promise<EmailResult>;

export type PaidOrderEmailResult = {
  customer: EmailResult | { sent: false; reason: "missing_customer_email" };
  admin: EmailResult | { sent: false; reason: "missing_notification_email" };
};

export async function sendPaidOrderEmails(
  order: OrderRecord,
  options: {
    sendEmailFn?: SendEmailFn;
    getTemplateFn?: (key: EmailTemplateKey) => Promise<EmailTemplateSettings>;
    env?: Record<string, string | undefined>;
  } = {}
): Promise<PaidOrderEmailResult> {
  const sendEmailFn = options.sendEmailFn ?? (message => sendCommerceEmail(message, { sourceCreatedAt: order.created_at }));
  const getTemplateFn = options.getTemplateFn ?? getEmailTemplate;
  const env = options.env ?? process.env;
  const customerEmail = order.email?.trim();
  const adminEmail = env.ORDER_NOTIFICATION_EMAIL?.trim();
  const customerTemplate = await resolveEmailTemplate("customer-order-confirmation", getTemplateFn);
  const adminTemplate = await resolveEmailTemplate("admin-new-order", getTemplateFn);
  const invoiceAttachment = getOrderInvoiceAttachment(order);

  const customer =
    customerEmail
      ? order.stripe_checkout_session_id.startsWith("cs_") && !invoiceAttachment
        ? { sent: false as const, reason: "invoice_pdf_not_ready" }
        : await sendPaidOrderEmailSafely(sendEmailFn, {
          to: customerEmail,
          subject: customerTemplate.subject,
          html: buildCustomerPaidOrderEmailHtml(order, customerTemplate),
          ...(invoiceAttachment ? { attachments: [invoiceAttachment] } : {}),
          from: getOrderFromEmail(env),
          replyTo: getOrderReplyToEmail(env),
          delivery: {
            messageType: "paid_order_customer",
            audience: "customer",
            entityType: "order",
            entityId: order.id ?? order.stripe_checkout_session_id,
            retryable: Boolean(order.id),
            idempotencyKey: createEmailIdempotencyKey(
              "paid_order_customer",
              order.id ?? order.stripe_checkout_session_id
            )
          }
        })
      : { sent: false as const, reason: "missing_customer_email" as const };

  const admin =
    adminEmail
      ? await sendPaidOrderEmailSafely(sendEmailFn, {
          to: adminEmail,
          from: getOrderFromEmail(env),
          replyTo: getOrderReplyToEmail(env),
          subject: adminTemplate.subject,
          html: buildAdminPaidOrderEmailHtml(order, adminTemplate),
          delivery: {
            messageType: "paid_order_admin",
            audience: "admin",
            entityType: "order",
            entityId: order.id ?? order.stripe_checkout_session_id,
            retryable: Boolean(order.id),
            idempotencyKey: createEmailIdempotencyKey(
              "paid_order_admin",
              order.id ?? order.stripe_checkout_session_id
            )
          }
        })
      : { sent: false as const, reason: "missing_notification_email" as const };

  return { customer, admin };
}

export function buildCustomerPaidOrderEmailHtml(order: OrderRecord, template = defaultEmailTemplates["customer-order-confirmation"]) {
  return renderCustomerOrderEmail(order, template, getBillingDetails(order), Boolean(getOrderInvoiceAttachment(order)));
}

export function getOrderInvoiceAttachment(order: OrderRecord) {
  const path = safeEmailUrl(getBillingDetails(order).invoicePdfUrl);
  if (!path || !["pay.stripe.com", "invoice.stripe.com", "files.stripe.com"].includes(new URL(path).hostname)) return undefined;
  return { filename: `Tap-Rater-Invoice-${getOrderReference(order)}.pdf`, path, contentType: "application/pdf" };
}

export function buildAdminPaidOrderEmailHtml(order: OrderRecord, template = defaultEmailTemplates["admin-new-order"]) {
  const billingDetails = getBillingDetails(order);
  return renderEmailTemplateHtml(template, {
    rows: {
      "Order number": getOrderReference(order),
      "Customer email": order.email ?? "",
      "Customer name": order.customer_name ?? "",
      Total: formatMoney(order.total_cents, order.currency),
      "Payment status": order.payment_status ?? order.status,
      "Shipping mode": order.shipping_mode ?? "",
      "Shipping amount": formatMoney(order.shipping_amount_cents, order.currency),
      "Production status": order.production_status,
      "Shipping status": order.shipping_status,
      "Invoice number": billingDetails.invoiceNumber ?? "",
      "Invoice PDF": billingDetails.invoicePdfUrl ?? "",
      "Stripe hosted invoice": billingDetails.hostedInvoiceUrl ?? "",
      "Receipt": billingDetails.receiptUrl ?? "",
      Carrier: order.shipping_carrier ?? "",
      "Tracking number": order.tracking_number ?? "",
      "Tracking URL": order.tracking_url ?? "",
      "Stripe session": order.stripe_checkout_session_id,
      "Payment intent": order.stripe_payment_intent_id ?? ""
    },
    body: [
      "Fulfillment details:",
      ...order.line_items_json.flatMap((item, index) => formatAdminLineItem(item, getAdminOrderArtworkUrl(order, index)))
    ]
  });
}

function formatAdminLineItem(item: OrderLineItem, artworkUrl?: string) {
  const summary = getOrderLineItemProductionSummary(item);
  const lines = [
    `${item.quantity} x ${item.title}`,
    `SKU: ${item.sku}`,
    `Option: ${summary.optionLabel}`,
    `Unit price: ${formatMoney(item.unitAmountCents, "usd")}`,
    `Line subtotal: ${formatMoney(item.lineSubtotalCents, "usd")}`,
    `Destination URL: ${summary.destinationUrl ?? "Not provided"}`,
    `Connection: ${summary.nfcBehavior}; ${summary.printedQrLabel}`,
    ...(item.optionId === "standard_direct" || summary.fulfillmentKind === "standard" ? [] : [`QR target: ${summary.qrTargetUrl ?? summary.generatedQrValue ?? "Not provided"}`]),
    `NFC target: ${summary.nfcTargetUrl ?? summary.destinationUrl ?? "Not provided"}`,
    `Production readiness: ${summary.statusLabel}`
  ];

  if (summary.businessName) lines.push(`Business name: ${summary.businessName}`);
  if (summary.logoReference) lines.push(`Logo reference: ${summary.logoReference}`);
  if (summary.logoMediaUrl) lines.push(`Logo media URL: ${summary.logoMediaUrl}`);
  if (summary.generatedQrValue) lines.push(`QR value: ${summary.generatedQrValue}`);
  if (summary.frontTemplateUrl) lines.push(`Front template: ${summary.frontTemplateUrl}`);
  if (summary.productionArtwork) {
    lines.push(`Production artwork status: ${summary.productionArtwork.status}`);
    lines.push(`Production template: ${summary.productionArtwork.templateId} / ${summary.productionArtwork.templateVersion}`);
    lines.push(`Production artwork dimensions: ${summary.productionArtwork.widthPx}x${summary.productionArtwork.heightPx}px @ ${summary.productionArtwork.dpi} DPI`);
    if (summary.productionArtwork.status === "generated" && artworkUrl) lines.push(`Production artwork (admin sign-in required): ${artworkUrl}`);
    if (summary.productionArtwork.error) lines.push(`Production artwork error: ${summary.productionArtwork.error}`);
  }
  lines.push(`Artwork confirmed: ${summary.proofConfirmed ? "Yes" : "No"}`);
  if (summary.warnings.length > 0) lines.push(`Warnings: ${summary.warnings.join("; ")}`);

  return lines;
}

function getOrderReference(order: OrderRecord) {
  return formatOrderReference(order.stripe_checkout_session_id || order.id);
}

function getBillingDetails(order: OrderRecord) {
  const details = order.customer_details_json && typeof order.customer_details_json === "object" ? order.customer_details_json : {};
  return {
    invoiceNumber: readString(details.invoice_number),
    hostedInvoiceUrl: readString(details.hosted_invoice_url),
    invoicePdfUrl: readString(details.invoice_pdf_url),
    receiptUrl: readString(details.receipt_url)
  };
}

async function sendPaidOrderEmailSafely(sendEmailFn: SendEmailFn, input: SendEmailInput): Promise<EmailResult> {
  try {
    return await sendEmailFn(input);
  } catch {
    return { sent: false, reason: "email_send_exception" };
  }
}

async function resolveEmailTemplate(key: EmailTemplateKey, getTemplateFn: (key: EmailTemplateKey) => Promise<EmailTemplateSettings>) {
  try {
    return await getTemplateFn(key);
  } catch {
    return defaultEmailTemplates[key];
  }
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(cents / 100);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}
