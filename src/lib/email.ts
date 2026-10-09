import { Resend } from "resend";
import {
  createEmailDeliveryIdentity,
  finishEmailDeliveryAttempt,
  startEmailDeliveryAttempt,
  type EmailDeliveryTracking
} from "@/lib/email-deliveries";

type EmailClient = {
  emails: {
    send: (
      input: { from: string; to: string | string[]; subject: string; html: string; replyTo?: string | string[]; attachments?: EmailAttachment[] },
      options?: { idempotencyKey?: string }
    ) => Promise<unknown>;
  };
};

export type EmailResult =
  | {
      sent: true;
    }
  | {
      sent: false;
      reason: string;
    };

export type EmailAttachment = { filename: string; path: string; contentType: string };

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  from?: string;
  replyTo?: string | string[];
  resendClient?: EmailClient;
  delivery?: EmailDeliveryTracking;
};

type EmailHtmlInput = {
  title?: string;
  eyebrow?: string;
  footer?: string;
  intro?: string;
  rows?: Record<string, string | number | null | undefined>;
  body?: string[];
  cta?: {
    label: string;
    url: string;
  };
};

type EmailClientInput = {
  resendClient?: EmailClient;
};

export function getDefaultFromEmail(env: Record<string, string | undefined> = process.env) {
  return env.SUPPORT_FROM_EMAIL || env.RESEND_FROM_EMAIL || "Tap Rater <notifications@taprater.com>";
}

export function getOrderFromEmail(env: Record<string, string | undefined> = process.env) {
  return env.ORDER_FROM_EMAIL || "Tap Rater Orders <orders@taprater.com>";
}

export function getOrderReplyToEmail(env: Record<string, string | undefined> = process.env) {
  return env.ORDER_REPLY_TO_EMAIL || "orders@taprater.com";
}

export function getCustomerReplyToEmail(env: Record<string, string | undefined> = process.env) {
  return env.CUSTOMER_SUPPORT_EMAIL || "support@taprater.com";
}

export function hasResendApiKey(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.RESEND_API_KEY);
}

// Never turn customer-provided protocols or markup into executable email content.
function emailWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function buildEmailHtml(input: EmailHtmlInput) {
  const e = escapeHtml;
  const title = input.title || input.intro || input.cta?.label || "An update from Tap Rater";
  const link = (label: string, value: string) => {
    const url = emailWebUrl(value);
    return url ? '<a href="' + e(url) + '" style="color:#087f7a;text-decoration:underline;overflow-wrap:anywhere;">' + e(label) + '</a>' : e(value);
  };
  const paragraphs = (input.body ?? []).filter(Boolean).map(line => {
    const match = line.match(/^([^:]+): (https:\/\/\S+)$/);
    const content = match ? link(match[1], match[2]) : e(line);
    return '<p style="font-size:15px;line-height:24px;color:#596675;margin:0 0 16px;overflow-wrap:anywhere;white-space:pre-line;">' + content + '</p>';
  }).join("");
  const rows = Object.entries(input.rows ?? {}).filter(([,v]) => v !== null && v !== undefined && v !== "").map(([label, value]) => {
    const text = String(value);
    const content = emailWebUrl(text) ? link(label, text) : e(text);
    return '<tr><td valign="top" width="36%" style="padding:12px;border-bottom:1px solid #e5e9ed;font-size:13px;color:#596675;">' + e(label) + '</td><td valign="top" style="padding:12px;border-bottom:1px solid #e5e9ed;font-size:14px;color:#152333;overflow-wrap:anywhere;word-break:break-word;white-space:pre-line;">' + content + '</td></tr>';
  }).join("");
  const ctaUrl = input.cta && emailWebUrl(input.cta.url);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(title) + '</title></head>' +
    '<body style="margin:0;padding:0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#152333;">' +
    '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">' + e(input.intro || title) + '</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f7;"><tr><td align="center" style="padding:28px 12px;">' +
    '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e9ed;border-radius:16px;">' +
    '<tr><td style="padding:28px 28px 22px;border-bottom:3px solid #e5ab35;"><span style="font-size:23px;font-weight:800;letter-spacing:1px;">TAP RATER</span><span style="color:#bd861b;font-size:18px;"> ★★★★★</span></td></tr>' +
    '<tr><td style="padding:28px;"><div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#087f7a;">' + e(input.eyebrow || "TAP RATER UPDATE") + '</div>' +
    '<h1 style="font-size:29px;line-height:36px;margin:12px 0 16px;">' + e(title) + '</h1>' +
    (input.intro && input.intro !== title ? '<p style="font-size:15px;line-height:24px;color:#596675;margin:0 0 22px;">' + e(input.intro) + '</p>' : '') + paragraphs +
    (rows ? '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;background:#f6f8fa;border-radius:8px;margin:20px 0;">' + rows + '</table>' : '') +
    (ctaUrl ? '<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;"><tr><td bgcolor="#087f7a" style="border-radius:8px;"><a href="' + e(ctaUrl) + '" style="display:inline-block;padding:15px 24px;border:1px solid #087f7a;border-radius:8px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">' + e(input.cta!.label) + '</a></td></tr></table>' : '') +
    '<p style="font-size:14px;line-height:23px;color:#596675;margin:24px 0 0;">Need help? ' + link("Contact support", "https://taprater.com/support") + '</p></td></tr>' +
    '<tr><td style="padding:22px 28px;border-top:1px solid #e5e9ed;background:#fafbfc;font-size:12px;line-height:20px;color:#6b7580;">' + e(input.footer || "Tap Rater NFC stands help local businesses connect with their customers.") + '<br><br>' + link("Shipping", "https://taprater.com/shipping") + ' &nbsp;·&nbsp; ' + link("Refund policy", "https://taprater.com/refund-policy") + ' &nbsp;·&nbsp; ' + link("Terms", "https://taprater.com/terms") + '</td></tr></table></td></tr></table></body></html>';
}

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  const identity = createEmailDeliveryIdentity(input.delivery);
  await startEmailDeliveryAttempt({
    identity,
    recipient: input.to,
    subject: input.subject,
    tracking: input.delivery
  });

  if (!hasResendApiKey()) {
    await finishEmailDeliveryAttempt({ id: identity.id, sent: false, failureReason: "missing_api_key" });
    return { sent: false, reason: "missing_api_key" };
  }

  const client = input.resendClient ?? new Resend(process.env.RESEND_API_KEY);
  let result: unknown;
  try {
    result = await client.emails.send(
      {
        from: input.from ?? getDefaultFromEmail(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
        ...(input.replyTo ? { replyTo: input.replyTo } : {})
      },
      { idempotencyKey: identity.idempotencyKey }
    );
  } catch {
    await finishEmailDeliveryAttempt({ id: identity.id, sent: false, failureReason: "email_send_exception" });
    return { sent: false, reason: "email_send_exception" };
  }
  const error = readResendError(result);

  await finishEmailDeliveryAttempt({
    id: identity.id,
    sent: !error,
    providerMessageId: readResendMessageId(result),
    failureReason: error ?? undefined
  });

  return error ? { sent: false, reason: error } : { sent: true };
}

export async function sendCustomerLoginLinkEmail(input: { to: string; loginUrl: string } & EmailClientInput) {
  return sendEmail({
    to: input.to,
    subject: "Your Tap Rater account login link",
    html: buildEmailHtml({
      title: "Sign in to your account",
      eyebrow: "ACCOUNT ACCESS",
      body: ["Use this secure link to access your Tap Rater account:", "This link expires in 20 minutes."],
      cta: {
        label: "Log in to Tap Rater",
        url: input.loginUrl
      }
    }),
    delivery: { messageType: "customer_login_link", audience: "customer" },
    replyTo: getCustomerReplyToEmail(),
    resendClient: input.resendClient
  });
}

export async function sendCustomerPasswordResetEmail(input: { to: string; resetUrl: string } & EmailClientInput) {
  return sendEmail({
    to: input.to,
    subject: "Reset your Tap Rater password",
    html: buildEmailHtml({
      title: "Reset your password",
      eyebrow: "ACCOUNT SECURITY",
      body: ["A password reset was requested for your Tap Rater account.", "This link expires in 20 minutes and can be used once. If you did not request it, you can ignore this email."],
      cta: { label: "Reset password", url: input.resetUrl }
    }),
    delivery: { messageType: "customer_password_reset", audience: "customer", retryable: false },
    replyTo: getCustomerReplyToEmail(),
    resendClient: input.resendClient
  });
}

export async function sendCustomerPasswordChangedEmail(to: string) {
  return sendEmail({
    to,
    subject: "Your Tap Rater password was changed",
    html: buildEmailHtml({ title: "Your password was changed", eyebrow: "ACCOUNT SECURITY", body: ["Your Tap Rater password has been changed. Previous account sessions have been signed out.", "If you did not make this change, contact Tap Rater support immediately by replying to this email."] }),
    delivery: { messageType: "customer_password_changed", audience: "customer", retryable: false },
    replyTo: getCustomerReplyToEmail()
  });
}

export async function sendQuoteRequestNotificationEmail(
  input: { to: string; name: string; email: string; businessName: string; notes?: string } & EmailClientInput
) {
  return sendEmail({
    to: input.to,
    subject: "New Tap Rater quote request",
    html: buildEmailHtml({
      intro: "A new quote request was submitted.",
      rows: {
        Name: input.name,
        Email: input.email,
        Business: input.businessName,
        Notes: input.notes ?? ""
      }
    }),
    delivery: { messageType: "quote_request_admin", audience: "admin" },
    resendClient: input.resendClient
  });
}

export async function sendQuoteRequestConfirmationEmail(input: { to: string; businessName: string } & EmailClientInput) {
  return sendEmail({
    to: input.to,
    subject: "Tap Rater received your request",
    html: buildEmailHtml({
      body: [
        `Thanks. Tap Rater received the request for ${input.businessName}.`,
        "We will review the details and follow up with next steps."
      ]
    }),
    delivery: { messageType: "quote_request_confirmation", audience: "customer" },
    replyTo: getCustomerReplyToEmail(),
    resendClient: input.resendClient
  });
}

export async function sendFeedbackAlertEmail(
  input: { to: string; businessName: string; customerName?: string; message: string } & EmailClientInput
) {
  return sendEmail({
    to: input.to,
    subject: "New Tap Rater feedback alert",
    html: buildEmailHtml({
      intro: "A feedback form was submitted.",
      rows: {
        Business: input.businessName,
        Customer: input.customerName ?? "",
        Message: input.message
      }
    }),
    delivery: { messageType: "feedback_alert", audience: "admin" },
    resendClient: input.resendClient
  });
}

export async function sendLinkChangeRequestEmail(
  input: { to: string; name: string; email: string; tapraterId: string; newReviewUrl: string; notes?: string } & EmailClientInput
) {
  return sendEmail({
    to: input.to,
    subject: "New Tap Rater link change request",
    html: buildEmailHtml({
      intro: "A customer requested a Tap Rater destination update.",
      rows: {
        Name: input.name,
        Email: input.email,
        "Tap Rater ID": input.tapraterId,
        "New URL": input.newReviewUrl,
        Notes: input.notes ?? ""
      }
    }),
    delivery: { messageType: "link_change_request_admin", audience: "admin" },
    resendClient: input.resendClient
  });
}

export async function sendScheduledReportEmail(
  input: { to: string; businessName: string; summary: string; reportUrl?: string } & EmailClientInput
) {
  return sendEmail({
    to: input.to,
    subject: `Tap Rater report for ${input.businessName}`,
    html: buildEmailHtml({
      intro: `Scheduled report for ${input.businessName}`,
      rows: {
        Summary: input.summary
      },
      cta: input.reportUrl ? { label: "Open report", url: input.reportUrl } : undefined
    }),
    delivery: { messageType: "scheduled_report", audience: "customer" },
    resendClient: input.resendClient
  });
}

function readResendMessageId(result: unknown) {
  if (!result || typeof result !== "object") return undefined;
  const data = (result as { data?: unknown }).data;
  if (!data || typeof data !== "object") return undefined;
  const id = (data as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

function readResendError(result: unknown) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const error = (result as { error?: unknown }).error;
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "email_send_failed";
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
