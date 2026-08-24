import { createCustomerLoginToken } from "@/lib/customer-auth";
import { createCustomerLoginUrl } from "@/lib/customer-login";
import { buildEmailHtml, getCustomerReplyToEmail, sendEmail, type EmailResult, type SendEmailInput } from "@/lib/email";

type SendEmailFn = (input: SendEmailInput) => Promise<EmailResult>;

export type HostedSetupEmailInput = {
  to: string;
  businessName: string;
  hostedPageUrl: string;
  sendEmailFn?: SendEmailFn;
};

export function buildHostedSetupEmailHtml(input: Pick<HostedSetupEmailInput, "businessName" | "hostedPageUrl"> & { accountUrl: string }) {
  return buildEmailHtml({
    body: [
      `Your Tap Rater hosted page for ${input.businessName} has been created.`,
      "You can manage your business name, logo, buttons, links, ordering, and basic appearance from My Page.",
      `Permanent public URL: ${input.hostedPageUrl}`,
      "That permanent URL stays the same when you update and publish your page links.",
      "Support: https://taprater.com/support"
    ],
    cta: {
      label: "Open My Page",
      url: input.accountUrl
    }
  });
}

export async function sendHostedSetupEmail(input: HostedSetupEmailInput): Promise<EmailResult> {
  try {
    const token = createCustomerLoginToken(input.to);
    const accountUrl = createCustomerLoginUrl(token);
    const sendEmailFn = input.sendEmailFn ?? sendEmail;

    return await sendEmailFn({
      to: input.to,
      subject: "Your Tap Rater page is ready",
      replyTo: getCustomerReplyToEmail(),
      html: buildHostedSetupEmailHtml({
        businessName: input.businessName,
        hostedPageUrl: input.hostedPageUrl,
        accountUrl
      })
    });
  } catch {
    return { sent: false, reason: "email_send_exception" };
  }
}
