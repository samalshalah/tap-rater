import { NextResponse } from "next/server";
import {
  getLandingPageBySlug,
  isLandingPageRepositoryConfigured,
  saveLandingPageSubmission
} from "@/lib/landing-pages";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const rateLimit = await checkPublicRateLimit(request, "hosted-submit", "PUBLIC_FORM_RATE_LIMITER");
  if (rateLimit.limited) return rateLimitResponse();

  const { slug } = await context.params;
  const page = await getLandingPageBySlug(slug);

  if (!page) {
    return NextResponse.json({ error: "Landing page not found." }, { status: 404 });
  }

  if (!isLandingPageRepositoryConfigured()) {
    return NextResponse.json({ error: "Landing page submissions are not configured yet." }, { status: 503 });
  }

  const body = readRecord(await request.json().catch(() => null));
  const name = readString(body.name);
  const email = readString(body.email);
  const phone = readString(body.phone);
  const message = readString(body.message) ?? readString(body.notes);
  const payload = sanitizePayload(body);

  try {
    await saveLandingPageSubmission({
      landingPageId: page.id,
      businessId: page.businessId,
      name,
      email,
      phone,
      message,
      payload
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Submission could not be saved." }, { status: 500 });
  }
}

function sanitizePayload(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, fieldValue]) => typeof fieldValue === "string")
      .map(([field, fieldValue]) => [field, String(fieldValue).slice(0, 1000)])
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 1000) : undefined;
}
