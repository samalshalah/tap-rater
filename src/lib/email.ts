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
      input: { from: string; to: string | string[]; subject: string; html: string; replyTo?: string | string[] },
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

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string | string[];
  resendClient?: EmailClient;
  delivery?: EmailDeliveryTracking;
};

type EmailHtmlInput = {
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
  return env.RESEND_FROM_EMAIL || "Tap Rater <notifications@taprater.com>";
}

export function getCustomerReplyToEmail(env: Record<string, string | undefined> = process.env) {
  return env.CUSTOMER_SUPPORT_EMAIL || "support@taprater.com";
}

export function hasResendApiKey(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.RESEND_API_KEY);
}

export function buildEmailHtml(input: EmailHtmlInput) {
  const sections: string[] = [];

  if (input.intro) {
    sections.push(`<p>${escapeHtml(input.intro)}</p>`);
  }

  if (input.body?.length) {
    sections.push(...input.body.map((line) => `<p>${escapeHtml(line)}</p>`));
  }

  if (input.rows) {
    sections.push(
      ...Object.entries(input.rows).map(([label, value]) => {
        return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(String(value ?? ""))}</p>`;
      })
    );
  }

  if (input.cta) {
    sections.push(`<p><a href="${escapeAttribute(input.cta.url)}">${escapeHtml(input.cta.label)}</a></p>`);
  }

  return sections.join("");
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
    html: buildEmailHtml({ body: ["Your Tap Rater password has been changed. Previous account sessions have been signed out.", "If you did not make this change, contact Tap Rater support immediately by replying to this email."] }),
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
