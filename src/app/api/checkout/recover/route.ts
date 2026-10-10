import { verifyRecoveryToken, loadReminderOrder, reminderState, startRecoveryPayment, emailHash } from "@/lib/checkout-reminders";
import { analyticsSql } from "@/lib/storefront-analytics-server";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
export async function POST(request: Request) {
  if (new URL(request.url).origin !== request.headers.get("origin")) return new Response(null, { status: 403 });
  const limit = await checkPublicRateLimit(request, "checkout-recovery", "PUBLIC_CHECKOUT_RATE_LIMITER");
  if (limit.limited) return rateLimitResponse();
  const input = await request.json().catch(() => null);
  const id = typeof input?.token === "string" ? verifyRecoveryToken(input.token) : null;
  if (!id) return Response.json({ error: "This link is invalid or expired. Please contact support." }, { status: 400, headers });
  try {
    const order = await loadReminderOrder(id), state = await reminderState(id);
    if (!state || Date.parse(state.token_expires_at) < Date.now()) throw new Error("This link has expired.");
    if (input.action === "unsubscribe") {
      await analyticsSql().query("INSERT INTO checkout_reminder_suppressions(email_hash) VALUES($1) ON CONFLICT DO NOTHING", [emailHash(order.email!)]);
      return Response.json({ ok: true }, { headers });
    }
    if (input.action !== "pay") return Response.json({ error: "Invalid action." }, { status: 400, headers });
    const result = await startRecoveryPayment(id);
    return Response.json(result.ok ? { url: result.url } : { error: result.error }, { status: result.ok ? 200 : 409, headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Payment could not be prepared. Contact support." }, { status: 409, headers });
  }
}
