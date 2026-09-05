import { NextResponse } from "next/server";
import { hashIpAddress } from "@/lib/device-redirect";
import { getLandingPageBySlug, isLandingPageRepositoryConfigured, logLandingPageClick } from "@/lib/landing-pages";
import { checkPublicRateLimit, getTrustedRequestIp, rateLimitResponse } from "@/lib/public-rate-limit";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

const destinationTypes = new Set(["google_review", "facebook_review", "yelp_profile", "booking", "social", "menu", "wifi", "custom", "landing_page"]);

export async function POST(request: Request, context: RouteContext) {
  const rateLimit = await checkPublicRateLimit(request, "hosted-click", "PUBLIC_EVENT_RATE_LIMITER");
  if (rateLimit.limited) return rateLimitResponse();

  const { slug } = await context.params;
  const page = await getLandingPageBySlug(slug);

  if (!page) {
    return NextResponse.json({ error: "Landing page not found." }, { status: 404 });
  }

  if (!isLandingPageRepositoryConfigured()) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const body = readRecord(await request.json().catch(() => null));
  const destinationType = normalizeDestinationType(body.destinationType ?? body.destination_type);
  const ipHash = hashIpAddress(getTrustedRequestIp(request.headers));

  await logLandingPageClick({
    landingPageId: page.id,
    businessId: page.businessId,
    destinationType,
    ipHash,
    userAgent: request.headers.get("user-agent") ?? undefined,
    referrer: request.headers.get("referer") ?? request.headers.get("referrer") ?? undefined
  });

  return NextResponse.json({ ok: true });
}

function normalizeDestinationType(value: unknown) {
  return typeof value === "string" && destinationTypes.has(value) ? value : "custom";
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
