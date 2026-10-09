import {
  analyticsEventSchema,
  recordAnalyticsEvent,
  requestIsInternal,
  revokeAnalyticsSession,
} from "@/lib/storefront-analytics-server";
import { checkPublicRateLimit } from "@/lib/public-rate-limit";
function allowed(request: Request) {
  return (
    request.headers.get("origin") === new URL(request.url).origin &&
    Number(request.headers.get("content-length") || 0) < 4096
  );
}
export async function POST(request: Request) {
  if (!allowed(request)) return new Response(null, { status: 403 });
  if (
    requestIsInternal(request) ||
    request.headers.get("sec-gpc") === "1" ||
    !/(?:^|;\s*)taprater_analytics_consent=granted(?:;|$)/.test(
      request.headers.get("cookie") || "",
    )
  )
    return new Response(null, { status: 204 });
  if (
    (
      await checkPublicRateLimit(
        request,
        "analytics",
        "PUBLIC_EVENT_RATE_LIMITER",
      )
    ).limited
  )
    return new Response(null, { status: 429 });
  const text = await request.text();
  if (text.length > 4096) return new Response(null, { status: 413 });
  let value;
  try {
    value = analyticsEventSchema.safeParse(JSON.parse(text));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!value.success) return new Response(null, { status: 400 });
  try {
    await recordAnalyticsEvent(value.data);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
export async function DELETE(request: Request) {
  if (!allowed(request)) return new Response(null, { status: 403 });
  const body = await request.json().catch(() => null);
  try {
    if (typeof body?.sessionId === "string")
      await revokeAnalyticsSession(body.sessionId, requestIsInternal(request));
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
