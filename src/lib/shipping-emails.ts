import { getCustomerReplyToEmail, sendEmail, type EmailResult, type SendEmailInput } from "@/lib/email";
import { defaultEmailTemplates, getEmailTemplate, renderEmailTemplateHtml, type EmailTemplateSettings } from "@/lib/email-templates";
import { formatOrderReference } from "@/lib/order-reference";
import type { OrderRecord } from "@/lib/orders";

type SendEmailFn = (input: SendEmailInput) => Promise<EmailResult>;

export type ShippingEmailInput = {
  order: OrderRecord;
  sendEmailFn?: SendEmailFn;
  getTemplateFn?: () => Promise<EmailTemplateSettings>;
};

export async function sendShippingNotificationEmail(input: ShippingEmailInput): Promise<EmailResult | { sent: false; reason: "missing_customer_email" }> {
  const to = input.order.email?.trim();
  if (!to) return { sent: false, reason: "missing_customer_email" };

  const template = await resolveShippingTemplate(input.getTemplateFn);
  const sendEmailFn = input.sendEmailFn ?? sendEmail;

  try {
    return await sendEmailFn({
      to,
      subject: template.subject,
      replyTo: getCustomerReplyToEmail(),
      html: buildShippingNotificationEmailHtml(input.order, template)
    });
  } catch {
    return { sent: false, reason: "email_send_exception" };
  }
}

export function buildShippingNotificationEmailHtml(order: OrderRecord, template = defaultEmailTemplates["shipping-tracking"]) {
  return renderEmailTemplateHtml(template, {
    rows: {
      "Order number": formatOrderReference(order.stripe_checkout_session_id || order.id),
      Status: "Shipped",
      Carrier: order.shipping_carrier ?? "",
      "Tracking number": order.tracking_number ?? "",
      "Tracking link": order.tracking_url ?? ""
    },
    body: [
      "Your Tap Rater order has shipped.",
      ...(order.tracking_url ? [`Tracking: ${order.tracking_url}`] : []),
      "Support: https://taprater.com/support"
    ]
  });
}

async function resolveShippingTemplate(getTemplateFn: (() => Promise<EmailTemplateSettings>) | undefined) {
  try {
    return getTemplateFn ? await getTemplateFn() : await getEmailTemplate("shipping-tracking");
  } catch {
    return defaultEmailTemplates["shipping-tracking"];
  }
}
