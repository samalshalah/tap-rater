import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { buildEmailHtml, sendEmail, type EmailResult, type SendEmailInput } from "@/lib/email";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import {
  defaultEmailTemplates,
  emailTemplateKeys,
  type EmailTemplateKey,
  type EmailTemplateSettings
} from "@/lib/email-template-config";

export { defaultEmailTemplates, emailTemplateKeys, type EmailTemplateKey, type EmailTemplateSettings };

export type EmailTemplateDbClient = {
  from: (table: string) => any;
};

export const emailTemplateSettingsSchema = z.object({
  key: z.enum(emailTemplateKeys),
  enabled: z.boolean().default(true),
  subject: z.string().trim().min(1).max(180),
  introText: z.string().trim().max(1000).default(""),
  supportText: z.string().trim().max(1000).default(""),
  footerText: z.string().trim().max(1000).default("")
});

export const emailTemplateTestSendSchema = z.object({
  key: z.enum(emailTemplateKeys),
  to: z.string().trim().email().max(180).optional()
});

type EmailTemplatePayload = z.infer<typeof emailTemplateSettingsSchema>;

export function getEmailTemplateStorageKey(key: EmailTemplateKey) {
  return `email:${key}`;
}

export function mergeEmailTemplatePayload(key: EmailTemplateKey, payload: unknown): EmailTemplateSettings {
  const defaults = defaultEmailTemplates[key];
  const parsed = emailTemplateSettingsSchema.partial({ key: true }).safeParse(payload ?? {});

  if (!parsed.success) {
    return defaults;
  }

  return {
    ...defaults,
    enabled: parsed.data.enabled ?? defaults.enabled,
    subject: parsed.data.subject ?? defaults.subject,
    introText: parsed.data.introText ?? defaults.introText,
    supportText: parsed.data.supportText ?? defaults.supportText,
    footerText: parsed.data.footerText ?? defaults.footerText
  };
}

export async function getEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplateSettings> {
  noStore();

  if (!hasSupabaseAdminConfig()) {
    return defaultEmailTemplates[key];
  }

  return getEmailTemplateWithClient(getSupabaseAdmin() as EmailTemplateDbClient, key);
}

export async function getEmailTemplateWithClient(client: EmailTemplateDbClient, key: EmailTemplateKey): Promise<EmailTemplateSettings> {
  try {
    const { data, error } = await client
      .from("site_content")
      .select("payload")
      .eq("key", getEmailTemplateStorageKey(key))
      .maybeSingle();

    if (error) {
      return defaultEmailTemplates[key];
    }

    return mergeEmailTemplatePayload(key, data?.payload);
  } catch {
    return defaultEmailTemplates[key];
  }
}

export async function getAllEmailTemplates(): Promise<EmailTemplateSettings[]> {
  noStore();

  if (!hasSupabaseAdminConfig()) {
    return emailTemplateKeys.map((key) => defaultEmailTemplates[key]);
  }

  return getAllEmailTemplatesWithClient(getSupabaseAdmin() as EmailTemplateDbClient);
}

export async function getAllEmailTemplatesWithClient(client: EmailTemplateDbClient): Promise<EmailTemplateSettings[]> {
  try {
    const storageKeys = emailTemplateKeys.map(getEmailTemplateStorageKey);
    const { data, error } = await client
      .from("site_content")
      .select("key,payload")
      .in("key", storageKeys);

    if (error || !Array.isArray(data)) {
      return emailTemplateKeys.map((key) => defaultEmailTemplates[key]);
    }

    const rowsByKey = new Map<string, unknown>(
      data.flatMap((row: unknown) => {
        if (!row || typeof row !== "object") {
          return [];
        }
        const record = row as { key?: unknown; payload?: unknown };
        return typeof record.key === "string" ? [[record.key, record.payload] as const] : [];
      })
    );

    return emailTemplateKeys.map((key) => mergeEmailTemplatePayload(key, rowsByKey.get(getEmailTemplateStorageKey(key))));
  } catch {
    return emailTemplateKeys.map((key) => defaultEmailTemplates[key]);
  }
}

export async function saveEmailTemplate(client: EmailTemplateDbClient, input: EmailTemplatePayload) {
  const parsed = emailTemplateSettingsSchema.parse(input);
  const payload = {
    enabled: parsed.enabled,
    subject: parsed.subject,
    introText: parsed.introText,
    supportText: parsed.supportText,
    footerText: parsed.footerText
  };

  const { error } = await client.from("site_content").upsert({
    key: getEmailTemplateStorageKey(parsed.key),
    type: "section",
    status: "published",
    payload,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(error.message);
  }

  return mergeEmailTemplatePayload(parsed.key, payload);
}

export function renderEmailTemplateHtml(
  template: Pick<EmailTemplateSettings, "introText" | "supportText" | "footerText">,
  input: Parameters<typeof buildEmailHtml>[0]
) {
  return buildEmailHtml({
    intro: template.introText,
    rows: input.rows,
    body: [
      ...(input.body ?? []),
      ...(template.supportText ? [template.supportText] : []),
      ...(template.footerText ? [template.footerText] : [])
    ],
    cta: input.cta
  });
}

export function buildEmailTemplatePreviewHtml(template: EmailTemplateSettings) {
  return renderEmailTemplateHtml(template, {
    rows: getSampleRowsForTemplate(template.key),
    body: getSampleBodyForTemplate(template.key)
  });
}

export async function sendEmailTemplateTest(input: {
  template: EmailTemplateSettings;
  to: string;
  sendEmailFn?: (email: SendEmailInput) => Promise<EmailResult>;
}) {
  if (!input.template.enabled) {
    return { sent: false as const, reason: "template_disabled" };
  }

  const sendEmailFn = input.sendEmailFn ?? sendEmail;
  return sendEmailFn({
    to: input.to,
    subject: `[Test] ${input.template.subject}`,
    html: buildEmailTemplatePreviewHtml(input.template)
  });
}

function getSampleRowsForTemplate(key: EmailTemplateKey) {
  if (key === "admin-new-order") {
    return {
      "Order number": "TR-260901-AB12CD",
      "Customer email": "buyer@example.com",
      Total: "$49.00",
      "Payment status": "paid"
    };
  }

  if (key === "support-request") {
    return {
      Name: "QA Customer",
      Email: "customer@example.com",
      Message: "I need help with my Tap Rater order."
    };
  }

  if (key === "shipping-tracking") {
    return {
      "Order number": "TR-260901-AB12CD",
      Carrier: "USPS",
      "Tracking number": "9400 0000 0000 0000 0000 00"
    };
  }

  return {
    "Order number": "TR-260901-AB12CD",
    Status: "Paid",
    Total: "$39.00"
  };
}

function getSampleBodyForTemplate(key: EmailTemplateKey) {
  if (key === "admin-new-order") {
    return [
      "Fulfillment details:",
      "1 x Google Review Stand",
      "Option: Standard Direct",
      "Connection: QR and NFC direct to destination",
      "Destination URL: https://example.com/review"
    ];
  }

  if (key === "support-request") {
    return ["Request details are generated from the submitted form fields."];
  }

  if (key === "shipping-tracking") {
    return ["Shipping/tracking emails are configured here but are not sent automatically in Phase 1C."];
  }

  return [
    "Order summary:",
    "1 x Google Review Stand - Standard Direct - $39.00",
    "Destination URL: https://example.com/review",
    "Connection: QR and NFC direct to destination",
    "Support: https://taprater.com/support",
    "Shipping: https://taprater.com/shipping",
    "Refund Policy: https://taprater.com/refund-policy",
    "Terms: https://taprater.com/terms"
  ];
}
