import {
  buildEmailHtml,
  sendEmail,
  type EmailResult,
  type SendEmailInput
} from "@/lib/email";
import {
  getOrderLineItemProductionSummary,
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
    env?: Record<string, string | undefined>;
  } = {}
): Promise<PaidOrderEmailResult> {
  const sendEmailFn = options.sendEmailFn ?? sendEmail;
  const env = options.env ?? process.env;
  const customerEmail = order.email?.trim();
  const adminEmail = env.ORDER_NOTIFICATION_EMAIL?.trim();

  const customer =
    customerEmail
      ? await sendPaidOrderEmailSafely(sendEmailFn, {
          to: customerEmail,
          subject: "Your Tap Rater order is confirmed",
          html: buildCustomerPaidOrderEmailHtml(order)
        })
      : { sent: false as const, reason: "missing_customer_email" as const };

  const admin =
    adminEmail
      ? await sendPaidOrderEmailSafely(sendEmailFn, {
          to: adminEmail,
          subject: "New paid Tap Rater order",
          html: buildAdminPaidOrderEmailHtml(order)
        })
      : { sent: false as const, reason: "missing_notification_email" as const };

  return { customer, admin };
}

export function buildCustomerPaidOrderEmailHtml(order: OrderRecord) {
  return buildEmailHtml({
    intro: "Your Tap Rater order is confirmed and marked paid.",
    rows: {
      "Order reference": getOrderReference(order),
      Status: "Paid",
      Total: formatMoney(order.total_cents, order.currency)
    },
    body: [
      "Order summary:",
      ...order.line_items_json.flatMap(formatCustomerLineItem),
      "What happens next: Tap Rater will review the production details before printing and shipping.",
      "Support: https://taprater.com/support",
      "Shipping: https://taprater.com/shipping",
      "Refund Policy: https://taprater.com/refund-policy",
      "Terms: https://taprater.com/terms"
    ]
  });
}

export function buildAdminPaidOrderEmailHtml(order: OrderRecord) {
  return buildEmailHtml({
    intro: "A paid Tap Rater order is ready for fulfillment review.",
    rows: {
      "Order reference": getOrderReference(order),
      "Customer email": order.email ?? "",
      "Customer name": order.customer_name ?? "",
      Total: formatMoney(order.total_cents, order.currency),
      "Payment status": order.payment_status ?? order.status,
      "Stripe session": order.stripe_checkout_session_id,
      "Payment intent": order.stripe_payment_intent_id ?? ""
    },
    body: [
      "Fulfillment details:",
      ...order.line_items_json.flatMap(formatAdminLineItem)
    ]
  });
}

function formatCustomerLineItem(item: OrderLineItem) {
  const summary = getOrderLineItemProductionSummary(item);
  const lines = [
    `${item.quantity} x ${item.title} - ${summary.optionLabel} - ${formatMoney(item.lineSubtotalCents, "usd")}`,
    `Destination URL: ${summary.destinationUrl ?? "Not provided"}`,
    `Connection: ${summary.nfcBehavior}; ${summary.printedQrLabel}`
  ];

  if (summary.fulfillmentKind === "branded" || summary.fulfillmentKind === "custom") {
    lines.push(`Business name: ${summary.businessName ?? "Not provided"}`);
    lines.push(`Logo: ${summary.logoReference ? "Uploaded" : "Not provided"}`);
    lines.push(`QR: ${summary.generatedQrValue ? "Generated" : "Not generated"}`);
    lines.push(`Proof confirmed: ${summary.proofConfirmed ? "Yes" : "No"}`);
  }

  return lines;
}

function formatAdminLineItem(item: OrderLineItem) {
  const summary = getOrderLineItemProductionSummary(item);
  const lines = [
    `${item.quantity} x ${item.title}`,
    `SKU: ${item.sku}`,
    `Option: ${summary.optionLabel}`,
    `Unit price: ${formatMoney(item.unitAmountCents, "usd")}`,
    `Line subtotal: ${formatMoney(item.lineSubtotalCents, "usd")}`,
    `Destination URL: ${summary.destinationUrl ?? "Not provided"}`,
    `Connection: ${summary.nfcBehavior}; ${summary.printedQrLabel}`,
    `Production readiness: ${summary.statusLabel}`
  ];

  if (summary.businessName) lines.push(`Business name: ${summary.businessName}`);
  if (summary.logoReference) lines.push(`Logo reference: ${summary.logoReference}`);
  if (summary.logoMediaUrl) lines.push(`Logo media URL: ${summary.logoMediaUrl}`);
  if (summary.generatedQrValue) lines.push(`QR value: ${summary.generatedQrValue}`);
  if (summary.frontTemplateUrl) lines.push(`Front template: ${summary.frontTemplateUrl}`);
  lines.push(`Proof confirmed: ${summary.proofConfirmed ? "Yes" : "No"}`);
  if (summary.warnings.length > 0) lines.push(`Warnings: ${summary.warnings.join("; ")}`);

  return lines;
}

function getOrderReference(order: OrderRecord) {
  return order.id ?? order.stripe_checkout_session_id;
}

async function sendPaidOrderEmailSafely(sendEmailFn: SendEmailFn, input: SendEmailInput): Promise<EmailResult> {
  try {
    return await sendEmailFn(input);
  } catch {
    return { sent: false, reason: "email_send_exception" };
  }
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(cents / 100);
}
