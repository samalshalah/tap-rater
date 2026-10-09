import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { getDatabaseUrlFromEnv } from "@/lib/neon-supabase-adapter";
import { analyticsPage } from "@/lib/storefront-analytics";
import { verifiedPurchase } from "@/lib/analytics-purchase";
import {
  campaignLabel,
  internalAnalyticsCookie,
} from "@/lib/analytics-attribution";
import { isValidAdminSession } from "@/lib/admin-auth";

export function analyticsSql(
  env: Record<string, string | undefined> = process.env,
) {
  const url = getDatabaseUrlFromEnv(env);
  if (!url) throw new Error("Analytics database is unavailable.");
  return neon(url);
}
export function requestIsInternal(request: Request) {
  const values = Object.fromEntries(
    (request.headers.get("cookie") || "")
      .split(";")
      .map((v) => v.trim().split("=")),
  );
  return (
    values[internalAnalyticsCookie] === "1" ||
    isValidAdminSession(values.taprater_admin)
  );
}
export const analyticsEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  name: z.enum([
    "page_view",
    "view_item",
    "add_to_cart",
    "remove_from_cart",
    "view_cart",
    "begin_checkout",
    "add_shipping_info",
    "payment_step",
    "add_payment_info",
    "checkout_error",
    "payment_error",
  ]),
  page: z
    .string()
    .max(200)
    .refine((v) => !!analyticsPage(v)),
  landing: z
    .string()
    .max(200)
    .refine((v) => !!analyticsPage(v)),
  source: z.string().refine((v) => !!campaignLabel(v)),
  medium: z.string().refine((v) => !!campaignLabel(v)),
  campaign: z
    .string()
    .optional()
    .refine((v) => v === undefined || !!campaignLabel(v)),
  device: z.enum(["mobile", "desktop", "tablet"]),
  itemId: z
    .string()
    .regex(/^[a-z0-9-]{1,100}$/)
    .optional(),
});
export async function recordAnalyticsEvent(
  input: z.infer<typeof analyticsEventSchema>,
) {
  const sql = analyticsSql();
  await sql.query(
    `INSERT INTO storefront_analytics_sessions(id,source,medium,campaign,landing_page,device) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(id) DO UPDATE SET last_seen=now()`,
    [
      input.sessionId,
      input.source,
      input.medium,
      input.campaign ?? null,
      input.landing,
      input.device,
    ],
  );
  await sql.query(
    `INSERT INTO storefront_analytics_events(id,session_id,event_name,page,item_id)
    SELECT $1,$2,$3,$4,$5 FROM storefront_analytics_sessions WHERE id=$2 AND consent AND NOT excluded
    ON CONFLICT(id) DO NOTHING`,
    [input.id, input.sessionId, input.name, input.page, input.itemId ?? null],
  );
}
const identitySchema = z.object({
  sessionId: z.string().uuid(),
  clientId: z
    .string()
    .regex(/^\d{1,20}\.\d{1,20}$/)
    .optional(),
  gaSessionId: z
    .string()
    .regex(/^\d{1,20}$/)
    .optional(),
  entry: analyticsEventSchema
    .pick({
      source: true,
      medium: true,
      campaign: true,
      landing: true,
      device: true,
    })
    .optional(),
});
export async function linkAnalyticsCheckout(
  request: Request,
  stripeId: string,
) {
  const excluded = requestIsInternal(request);
  let identity: z.infer<typeof identitySchema> | undefined;
  try {
    identity = identitySchema.parse(
      JSON.parse(request.headers.get("x-taprater-analytics") || "null"),
    );
  } catch {}
  const sql = analyticsSql();
  const permitted =
    /(?:^|;\s*)taprater_analytics_consent=granted(?:;|$)/.test(
      request.headers.get("cookie") || "",
    ) && request.headers.get("sec-gpc") !== "1";
  if (identity?.entry && !excluded && permitted) {
    const e = identity.entry;
    await sql.query(
      "INSERT INTO storefront_analytics_sessions(id,source,medium,campaign,landing_page,device) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING",
      [
        identity.sessionId,
        e.source,
        e.medium,
        e.campaign ?? null,
        e.landing,
        e.device,
      ],
    );
  }
  const rows =
    identity && !excluded && permitted
      ? await sql.query(
          "SELECT id FROM storefront_analytics_sessions WHERE id=$1 AND consent AND NOT excluded",
          [identity.sessionId],
        )
      : [];
  const consent = rows.length > 0;
  await sql.query(
    `INSERT INTO storefront_analytics_checkouts(stripe_session_id,session_id,excluded,ga_client_id,ga_session_id,consent)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(stripe_session_id) DO UPDATE SET excluded=storefront_analytics_checkouts.excluded OR EXCLUDED.excluded`,
    [
      stripeId,
      consent ? identity!.sessionId : null,
      excluded,
      consent ? (identity?.clientId ?? null) : null,
      consent ? (identity?.gaSessionId ?? null) : null,
      consent,
    ],
  );
}
export async function revokeAnalyticsSession(
  sessionId: string,
  excluded = false,
) {
  if (!z.string().uuid().safeParse(sessionId).success) return;
  const sql = analyticsSql();
  await sql.query(
    "UPDATE storefront_analytics_sessions SET consent=false,excluded=excluded OR $2 WHERE id=$1",
    [sessionId, excluded],
  );
  await sql.query(
    "UPDATE storefront_analytics_checkouts SET consent=false,excluded=excluded OR $2 WHERE session_id=$1",
    [sessionId, excluded],
  );
}
// Purchases are generated exclusively from persisted Stripe-confirmed orders, never browser amounts.
export async function flushAnalyticsPurchases(
  env: Record<string, string | undefined> = process.env,
) {
  if (!env.GA4_API_SECRET || env.GA4_ENABLED !== "true") return { sent: 0 };
  const sql = analyticsSql(env);
  const rows = await sql.query(
    `UPDATE storefront_analytics_checkouts c SET last_attempt_at=now(),attempts=attempts+1,purchase_at=COALESCE(purchase_at,now())
    WHERE c.stripe_session_id IN (SELECT a.stripe_session_id FROM storefront_analytics_checkouts a JOIN orders o ON o.stripe_checkout_session_id=a.stripe_session_id
    JOIN storefront_analytics_sessions s ON s.id=a.session_id WHERE o.status='paid' AND o.payment_status='paid'
    AND a.stripe_session_id LIKE 'cs_live_%' AND a.consent AND NOT a.excluded AND s.consent AND NOT s.excluded
    AND a.ga_client_id IS NOT NULL AND a.ga_session_id IS NOT NULL AND a.sent_at IS NULL AND a.ga_status!='invalid_order'
    AND a.created_at>now()-interval '72 hours' AND (a.last_attempt_at IS NULL OR a.last_attempt_at<now()-interval '5 minutes') LIMIT 20)
    AND (c.last_attempt_at IS NULL OR c.last_attempt_at<now()-interval '5 minutes') RETURNING c.*`,
    [],
  );
  let sent = 0;
  for (const row of rows) {
    const [order] = await sql.query(
      "SELECT * FROM orders WHERE stripe_checkout_session_id=$1",
      [row.stripe_session_id],
    );
    const purchase = verifiedPurchase(order);
    if (!purchase) {
      await sql.query(
        "UPDATE storefront_analytics_checkouts SET ga_status='invalid_order' WHERE stripe_session_id=$1",
        [row.stripe_session_id],
      );
      continue;
    }
    try {
      const response = await fetch(
        "https://www.google-analytics.com/mp/collect?measurement_id=" +
          encodeURIComponent(env.GA4_MEASUREMENT_ID!) +
          "&api_secret=" +
          encodeURIComponent(env.GA4_API_SECRET),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            client_id: row.ga_client_id,
            timestamp_micros:
              new Date(row.purchase_at as string).getTime() * 1000,
            consent: { ad_user_data: "DENIED", ad_personalization: "DENIED" },
            events: [
              {
                name: "purchase",
                params: {
                  ...purchase,
                  session_id: row.ga_session_id,
                  engagement_time_msec: 1,
                },
              },
            ],
          }),
        },
      );
      if (!response.ok) throw new Error("transport");
      await sql.query(
        "UPDATE storefront_analytics_checkouts SET sent_at=now(),ga_status='submitted' WHERE stripe_session_id=$1",
        [row.stripe_session_id],
      );
      sent++;
    } catch {
      await sql.query(
        "UPDATE storefront_analytics_checkouts SET ga_status='retrying' WHERE stripe_session_id=$1",
        [row.stripe_session_id],
      );
    }
  }
  return { sent };
}
