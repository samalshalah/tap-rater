import { analyticsSql } from "@/lib/storefront-analytics-server";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if ((await checkPublicRateLimit(request, "checkout-activity", "PUBLIC_CHECKOUT_RATE_LIMITER")).limited) return rateLimitResponse();
  const body = await request.json().catch(() => null);
  if (typeof body?.sessionId !== "string" || !/^cs_live_[A-Za-z0-9]{20,150}$/.test(body.sessionId)) return new Response(null, { status: 400 });
  await analyticsSql().query(`UPDATE checkout_reminders r SET last_activity_at=now() FROM orders o
    WHERE r.order_id=o.id AND o.stripe_checkout_session_id=$1 AND o.status='pending_payment'`, [body.sessionId]);
  return new Response(null, { status: 204 });
}
