import { sendEmail, type EmailResult } from "@/lib/email";
import {
  defaultEmailTemplates,
  getEmailTemplate,
  renderEmailTemplateHtml,
  type EmailTemplateSettings
} from "@/lib/email-templates";

type NotificationPayload = {
  subject: string;
  rows: Record<string, string>;
};

export async function sendRequestNotification(
  payload: NotificationPayload,
  options: {
    getTemplateFn?: () => Promise<EmailTemplateSettings>;
    sendEmailFn?: typeof sendEmail;
  } = {}
): Promise<EmailResult | { sent: false; reason: "missing_notification_email" | "template_disabled" }> {
  const to = process.env.ORDER_NOTIFICATION_EMAIL;

  if (!to) {
    return { sent: false, reason: "missing_notification_email" };
  }

  const template = await resolveRequestTemplate(options.getTemplateFn);
  if (!template.enabled) {
    return { sent: false, reason: "template_disabled" };
  }

  try {
    return await (options.sendEmailFn ?? sendEmail)({
      to,
      subject: template.subject || payload.subject,
      html: renderEmailTemplateHtml(template, {
        rows: payload.rows
      }),
      delivery: { messageType: "support_request_admin", audience: "admin" }
    });
  } catch {
    return { sent: false, reason: "email_send_exception" };
  }
}

async function resolveRequestTemplate(getTemplateFn: (() => Promise<EmailTemplateSettings>) | undefined) {
  try {
    return getTemplateFn ? await getTemplateFn() : await getEmailTemplate("support-request");
  } catch {
    return defaultEmailTemplates["support-request"];
  }
}
