import { getOrderFromEmail } from "@/lib/email";
import { getOrderReplyToEmail, sendEmail, type EmailResult, type SendEmailInput } from "@/lib/email";
import { createEmailIdempotencyKey } from "@/lib/email-deliveries";
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

  const template = await resolveShippingTemplate(input.getTemplateFn, isReplacementOrder(input.order));
  const sendEmailFn = input.sendEmailFn ?? sendEmail;

  try {
    return await sendEmailFn({
      to,
      subject: template.subject,
      from: getOrderFromEmail(),
      replyTo: getOrderReplyToEmail(),
      html: buildShippingNotificationEmailHtml(input.order, template),
      delivery: {
        messageType: "shipping_tracking_customer",
        audience: "customer",
        entityType: "order",
        entityId: input.order.id ?? input.order.stripe_checkout_session_id,
        retryable: Boolean(input.order.id),
        idempotencyKey: createEmailIdempotencyKey(
          "shipping_tracking_customer",
          input.order.id ?? input.order.stripe_checkout_session_id,
          input.order.shipping_status,
          input.order.tracking_number,
          input.order.shipped_at
        )
      }
    });
  } catch {
    return { sent: false, reason: "email_send_exception" };
  }
}

export function buildShippingNotificationEmailHtml(order: OrderRecord, template = defaultEmailTemplates["shipping-tracking"]) {
  const replacement = isReplacementOrder(order);
  const originalReference = typeof order.customer_details_json?.replacement_of_order_reference === "string" ? order.customer_details_json.replacement_of_order_reference : "your original order";
  return renderEmailTemplateHtml(template, {
    title: replacement ? "Your replacement stand is on its way." : "Your order is on its way.",
    eyebrow: replacement ? "REPLACEMENT SHIPPED" : "SHIPPED",
    cta: order.tracking_url ? { label: "Track your shipment", url: order.tracking_url } : { label: "View your order", url: "https://taprater.com/account/orders" },
    rows: {
      "Order number": formatOrderReference(order.stripe_checkout_session_id || order.id),
      ...(replacement ? { "Replacing": formatOrderReference(originalReference), "Payment due": "No payment required" } : {}),
      Status: "Shipped",
      Carrier: order.shipping_carrier ?? "",
      "Tracking number": order.tracking_number ?? "",
      "Tracking link": order.tracking_url ?? ""
    },
    body: [
      replacement ? "Your replacement stand has shipped. No payment is required." : "Your Tap Rater order has shipped.",

      "Support: https://taprater.com/support"
    ]
  });
}

async function resolveShippingTemplate(getTemplateFn: (() => Promise<EmailTemplateSettings>) | undefined, replacement: boolean) {
  try {
    return getTemplateFn ? await getTemplateFn() : await getEmailTemplate(replacement ? "replacement-shipping" : "shipping-tracking");
  } catch {
    return defaultEmailTemplates[replacement ? "replacement-shipping" : "shipping-tracking"];
  }
}

function isReplacementOrder(order: OrderRecord) {
  return typeof order.customer_details_json?.replacement_of_order_id === "string";
}
