import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

export type LandingPageTemplateType =
  | "multi_platform_review"
  | "feedback_form"
  | "referral_form"
  | "appointment_booking"
  | "social_links"
  | "digital_business_card";

export type LandingPageButton = {
  label: string;
  url: string;
  platform?: string;
  destinationType?: string;
};

export type LandingPageFormConfig = {
  fields?: string[];
  submitLabel?: string;
  successMessage?: string;
};

export type LandingPage = {
  id: string;
  businessId?: string;
  slug: string;
  templateType: LandingPageTemplateType;
  title: string;
  headline: string;
  description: string;
  logoUrl?: string;
  buttons: LandingPageButton[];
  formConfig: LandingPageFormConfig;
};

export type LandingPageSubmissionInput = {
  landingPageId: string;
  businessId?: string;
  deviceId?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  payload?: Record<string, unknown>;
};

export type LandingPageClickInput = {
  landingPageId: string;
  businessId?: string;
  deviceId?: string;
  destinationType?: string;
  ipHash?: string;
  userAgent?: string;
  referrer?: string;
};

export type LandingPageDbClient = {
  from: (table: string) => any;
};

export function isLandingPageRepositoryConfigured() {
  return hasSupabaseAdminConfig();
}

export function getDemoLandingPage(): LandingPage {
  return {
    id: "demo-landing-page",
    slug: "demo",
    templateType: "multi_platform_review",
    title: "Tap Rater Demo Page",
    headline: "Choose where you want to leave feedback",
    description: "This demo shows how a hosted Tap Rater page can route customers to reviews, booking, social links, or private feedback.",
    buttons: [
      { label: "Review us on Google", url: "https://search.google.com/local/writereview?placeid=demo", platform: "Google", destinationType: "google_review" },
      { label: "Visit Facebook", url: "https://facebook.com", platform: "Facebook", destinationType: "facebook_review" },
      { label: "Book an appointment", url: "https://example.com/book", platform: "Booking", destinationType: "booking" }
    ],
    formConfig: {
      fields: ["name", "email", "message"],
      submitLabel: "Send feedback",
      successMessage: "Thanks. Your feedback was sent."
    }
  };
}

export async function getLandingPageBySlug(slug: string): Promise<LandingPage | null> {
  if (!hasSupabaseAdminConfig()) {
    return slug === "demo" ? getDemoLandingPage() : null;
  }

  try {
    const page = await getLandingPageBySlugFromClient(getSupabaseAdmin() as LandingPageDbClient, slug);
    return page ?? (slug === "demo" ? getDemoLandingPage() : null);
  } catch {
    return slug === "demo" ? getDemoLandingPage() : null;
  }
}

export async function getLandingPageBySlugFromClient(client: LandingPageDbClient, slug: string): Promise<LandingPage | null> {
  const { data, error } = await client.from("landing_pages").select("*").eq("slug", slug).maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeLandingPage(data);
}

export async function saveLandingPageSubmission(input: LandingPageSubmissionInput) {
  if (!hasSupabaseAdminConfig()) {
    return;
  }

  await saveLandingPageSubmissionWithClient(getSupabaseAdmin() as LandingPageDbClient, input);
}

export async function saveLandingPageSubmissionWithClient(client: LandingPageDbClient, input: LandingPageSubmissionInput) {
  const { error } = await client.from("form_submissions").insert({
    landing_page_id: input.landingPageId,
    business_id: input.businessId ?? null,
    device_id: input.deviceId ?? null,
    name: input.name ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    message: input.message ?? null,
    payload_json: input.payload ?? {}
  });

  if (error) {
    throw new Error(error.message ?? "Landing page submission could not be saved.");
  }
}

export async function logLandingPageClick(input: LandingPageClickInput) {
  if (!hasSupabaseAdminConfig()) {
    return;
  }

  try {
    await logLandingPageClickWithClient(getSupabaseAdmin() as LandingPageDbClient, input);
  } catch {
    // Analytics should not block visitor navigation.
  }
}

export async function logLandingPageClickWithClient(client: LandingPageDbClient, input: LandingPageClickInput) {
  const { error } = await client.from("tap_events").insert({
    device_id: input.deviceId ?? null,
    business_id: input.businessId ?? null,
    event_type: "button_click",
    destination_type: input.destinationType ?? null,
    ip_hash: input.ipHash ?? null,
    user_agent: input.userAgent ?? null,
    referrer: input.referrer ?? null
  });

  if (error) {
    throw new Error(error.message ?? "Landing page click could not be logged.");
  }
}

export function normalizeLandingPage(row: unknown): LandingPage | null {
  const value = readRecord(row);
  const id = readString(value.id);
  const slug = readString(value.slug);
  const templateType = readTemplateType(value.template_type);
  const status = readString(value.status);

  if (!id || !slug || !templateType || (status && status !== "published")) {
    return null;
  }

  return {
    id,
    businessId: readString(value.business_id),
    slug,
    templateType,
    title: readString(value.title) ?? "Tap Rater",
    headline: readString(value.headline) ?? readString(value.title) ?? "Tap Rater",
    description: readString(value.description) ?? "",
    logoUrl: readString(value.logo_url),
    buttons: normalizeButtons(value.buttons_json),
    formConfig: normalizeFormConfig(value.form_config_json)
  };
}

function normalizeButtons(value: unknown): LandingPageButton[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((button): LandingPageButton | null => {
      const record = readRecord(button);
      const label = readString(record.label);
      const url = readString(record.url) ?? readString(record.href);

      if (!label || !url || !isSafeUrl(url)) {
        return null;
      }

      return {
        label,
        url,
        platform: readString(record.platform),
        destinationType: readString(record.destinationType) ?? readString(record.destination_type)
      };
    })
    .filter((button): button is LandingPageButton => Boolean(button));
}

function normalizeFormConfig(value: unknown): LandingPageFormConfig {
  const record = readRecord(value);
  const fields = Array.isArray(record.fields) ? record.fields.filter((field): field is string => typeof field === "string") : undefined;

  return {
    fields,
    submitLabel: readString(record.submitLabel) ?? readString(record.submit_label),
    successMessage: readString(record.successMessage) ?? readString(record.success_message)
  };
}

function readTemplateType(value: unknown): LandingPageTemplateType | undefined {
  if (value === "business_card") {
    return "digital_business_card";
  }

  const types: LandingPageTemplateType[] = [
    "multi_platform_review",
    "feedback_form",
    "referral_form",
    "appointment_booking",
    "social_links",
    "digital_business_card"
  ];
  return types.includes(value as LandingPageTemplateType) ? (value as LandingPageTemplateType) : undefined;
}

function isSafeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}
