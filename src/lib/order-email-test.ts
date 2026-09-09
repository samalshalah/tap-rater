import { getCustomerReplyToEmail, sendEmail, type EmailResult, type SendEmailInput } from "@/lib/email";
import type { EmailTemplateSettings } from "@/lib/email-templates";
import { buildCustomerPaidOrderEmailHtml } from "@/lib/order-emails";
import type { OrderRecord } from "@/lib/orders";

// Synthetic data only: this preview never loads, creates or updates a customer order.
const multiLinkTestOrder: OrderRecord = {
  id: "multilink-email-preview",
  stripe_checkout_session_id: "cs_test_multilink_email_preview",
  stripe_payment_intent_id: null,
  status: "paid",
  payment_status: "paid",
  email: "qa@example.com",
  customer_name: "Multi-Link Email QA - Do Not Fulfill",
  subtotal_cents: 5899,
  total_cents: 7393,
  currency: "usd",
  shipping_amount_cents: 1200,
  shipping_mode: "flat",
  production_status: "not_started",
  shipping_status: "not_shipped",
  shipping_method: null,
  shipping_carrier: null,
  tracking_number: null,
  tracking_url: null,
  shipped_at: null,
  internal_notes: "Synthetic preview only",
  admin_fulfillment_notes: "Do not fulfill",
  line_items_json: [{
    productId: "google-review-stand",
    optionId: "branded_qr_direct",
    optionLabel: "Branded + QR Direct Stand",
    title: "Google Review Stand",
    sku: "GRS",
    quantity: 1,
    unitAmountCents: 4900,
    lineSubtotalCents: 4900,
    proofApproved: true,
    setup: {
      serviceMode: "HOSTED",
      serviceAddon: "hosted_multilink",
      businessName: "Multi-Link Email QA - Do Not Fulfill",
      logoMediaUrl: "/uploads/brand/tap-rater-logo.png"
    }
  }]
};

export function buildMultiLinkOrderEmailTestHtml(template: EmailTemplateSettings) {
  return "<p><strong>TEST EMAIL ONLY. No purchase was made. Do not fulfill this sample order.</strong></p>"
    + buildCustomerPaidOrderEmailHtml(multiLinkTestOrder, template);
}

export async function sendMultiLinkOrderEmailTest(input: {
  template: EmailTemplateSettings;
  to: string;
  sendEmailFn?: (email: SendEmailInput) => Promise<EmailResult>;
}): Promise<EmailResult> {
  if (input.template.key !== "customer-order-confirmation") {
    return { sent: false, reason: "invalid_test_template" };
  }
  if (!input.template.enabled) return { sent: false, reason: "template_disabled" };

  return (input.sendEmailFn ?? sendEmail)({
    to: input.to,
    subject: `[Test Multi-Link] ${input.template.subject}`,
    html: buildMultiLinkOrderEmailTestHtml(input.template),
    replyTo: getCustomerReplyToEmail(),
    delivery: {
      messageType: "template_test",
      audience: "admin",
      entityType: "email_template",
      entityId: "customer-order-confirmation:hosted_multilink",
      retryable: false
    }
  });
}
