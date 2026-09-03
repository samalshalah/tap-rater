import { createCustomerActivationUrl } from "@/lib/customer-account";
import { buildEmailHtml, getCustomerReplyToEmail, sendEmail, type EmailResult, type SendEmailInput } from "@/lib/email";
import { formatOrderReference } from "@/lib/order-reference";

type SendEmailFn = (input: SendEmailInput) => Promise<EmailResult>;

export type HostedSetupEmailInput = {
  to: string;
  businessName: string;
  hostedPageUrl: string;
  activationToken: string;
  sendEmailFn?: SendEmailFn;
};

export function buildHostedSetupEmailHtml(input: Pick<HostedSetupEmailInput, "businessName" | "hostedPageUrl"> & { activationUrl: string }) {
  return buildEmailHtml({
    body: [
      `Your Tap Rater Multi-Link page for ${input.businessName} has been created.`,
      "Activate your account and set your password to manage your business name, logo, buttons, links, icons, ordering, and page style.",
      `Permanent public URL: ${input.hostedPageUrl}`,
      "That permanent URL stays the same when you update and publish your page links.",
      "This activation link expires in 7 days.",
      "Support: https://taprater.com/support"
    ],
    cta: {
      label: "Activate My Account",
      url: input.activationUrl
    }
  });
}

export async function sendHostedSetupEmail(input: HostedSetupEmailInput): Promise<EmailResult> {
  try {
    const activationUrl = createCustomerActivationUrl(input.activationToken);
    const sendEmailFn = input.sendEmailFn ?? sendEmail;

    return await sendEmailFn({
      to: input.to,
      subject: "Activate your Tap Rater Multi-Link account",
      replyTo: getCustomerReplyToEmail(),
      html: buildHostedSetupEmailHtml({
        businessName: input.businessName,
        hostedPageUrl: input.hostedPageUrl,
        activationUrl
      })
    });
  } catch {
    return { sent: false, reason: "email_send_exception" };
  }
}

export async function sendCustomerAccountSetupEmail(input: {
  to: string;
  businessName: string;
  orderReference: string;
  activationToken: string;
  sendEmailFn?: SendEmailFn;
}): Promise<EmailResult> {
  try {
    const activationUrl = createCustomerActivationUrl(input.activationToken);
    const sendEmailFn = input.sendEmailFn ?? sendEmail;

    return await sendEmailFn({
      to: input.to,
      subject: "Activate your Tap Rater account",
      replyTo: getCustomerReplyToEmail(),
      html: buildEmailHtml({
        body: [
          `Your Tap Rater order for ${input.businessName} was received.`,
          "Activate your account and set your password so you can access order and business setup details.",
          `Order number: ${formatOrderReference(input.orderReference)}`,
          "Tap Rater will contact you with the next step for payment and fulfillment.",
          "This activation link expires in 7 days.",
          "Support: https://taprater.com/support"
        ],
        cta: {
          label: "Activate My Account",
          url: activationUrl
        }
      })
    });
  } catch {
    return { sent: false, reason: "email_send_exception" };
  }
}

export async function sendPaidCustomerAccountSetupEmail(input: {
  to: string;
  businessName: string;
  orderReference: string;
  activationToken: string;
  sendEmailFn?: SendEmailFn;
}): Promise<EmailResult> {
  try {
    const activationUrl = createCustomerActivationUrl(input.activationToken);
    const sendEmailFn = input.sendEmailFn ?? sendEmail;

    return await sendEmailFn({
      to: input.to,
      subject: "Activate your Tap Rater account",
      replyTo: getCustomerReplyToEmail(),
      html: buildEmailHtml({
        body: [
          `Your Tap Rater order for ${input.businessName} was received.`,
          "Activate your account and set your password to view orders, invoices, receipts, and billing details.",
          `Order number: ${formatOrderReference(input.orderReference)}`,
          "This activation link expires in 7 days.",
          "Support: https://taprater.com/support"
        ],
        cta: {
          label: "Activate My Account",
          url: activationUrl
        }
      })
    });
  } catch {
    return { sent: false, reason: "email_send_exception" };
  }
}
