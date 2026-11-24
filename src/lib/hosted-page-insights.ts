import { liveDb } from "@/lib/google-business/live-reviews";

export const insightRanges = [7, 30, 90] as const;
export type InsightRange = (typeof insightRanges)[number];
export const insightTimeZone = "America/New_York";

export type HostedPageInsights = {
  days: InsightRange;
  opens: number;
  clicks: number;
  byDay: { date: string; opens: number; clicks: number }[];
  bySource: { source: "qr" | "nfc" | "direct"; opens: number }[];
  byButton: { buttonId: string; buttonType: string | null; clicks: number }[];
  byWeekday: { weekday: number; opens: number }[];
  byHour: { hour: number; opens: number }[];
  byDevice: { device: "ios" | "android" | "other"; opens: number }[];
  byStand: { standId: string; label: string; location: string; opens: number; clicks: number }[];
};

export function readInsightRange(value: string | null | undefined): InsightRange {
  const days = Number(value);
  return (insightRanges as readonly number[]).includes(days) ? (days as InsightRange) : 30;
}

type Sql = ReturnType<typeof liveDb>;
const n = (value: unknown) => Number(value ?? 0);

// Anonymous counts for one Multi-Link page over the last N days.
export async function getHostedPageInsights(code: string, days: InsightRange, sql: Sql = liveDb()): Promise<HostedPageInsights> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [totals, byDay, bySource, byButton, byWeekday, byHour, byDevice, byStand] = await Promise.all([
    sql`SELECT count(*) FILTER (WHERE event_type='view') AS opens, count(*) FILTER (WHERE event_type='click') AS clicks
      FROM hosted_page_events WHERE code=${code} AND created_at>=${since}::timestamptz`,
    sql`SELECT to_char(created_at AT TIME ZONE ${insightTimeZone},'YYYY-MM-DD') AS date,
        count(*) FILTER (WHERE event_type='view') AS opens, count(*) FILTER (WHERE event_type='click') AS clicks
      FROM hosted_page_events WHERE code=${code} AND created_at>=${since}::timestamptz GROUP BY 1 ORDER BY 1`,
    sql`SELECT source, count(*) AS opens FROM hosted_page_events WHERE code=${code} AND event_type='view' AND created_at>=${since}::timestamptz GROUP BY 1`,
    sql`SELECT button_id, max(button_type) AS button_type, count(*) AS clicks FROM hosted_page_events
      WHERE code=${code} AND event_type='click' AND created_at>=${since}::timestamptz GROUP BY 1 ORDER BY 3 DESC`,
    sql`SELECT extract(dow FROM created_at AT TIME ZONE ${insightTimeZone})::int AS weekday, count(*) AS opens FROM hosted_page_events
      WHERE code=${code} AND event_type='view' AND created_at>=${since}::timestamptz GROUP BY 1`,
    sql`SELECT extract(hour FROM created_at AT TIME ZONE ${insightTimeZone})::int AS hour, count(*) AS opens FROM hosted_page_events
      WHERE code=${code} AND event_type='view' AND created_at>=${since}::timestamptz GROUP BY 1`,
    sql`SELECT device, count(*) AS opens FROM hosted_page_events WHERE code=${code} AND event_type='view' AND created_at>=${since}::timestamptz GROUP BY 1`,
    // Stand names and locations come from the client's own stand labels and business assignments.
    sql`SELECT e.stand_id, coalesce(nullif(r.draft_label,''),'') AS label, coalesce(b.business_name,'') AS location,
        count(*) FILTER (WHERE e.event_type='view') AS opens, count(*) FILTER (WHERE e.event_type='click') AS clicks
      FROM hosted_page_events e LEFT JOIN customer_stand_registry r ON r.public_id=e.stand_id LEFT JOIN businesses b ON b.id=r.draft_business_id
      WHERE e.code=${code} AND e.stand_id IS NOT NULL AND e.created_at>=${since}::timestamptz
      GROUP BY 1,2,3 ORDER BY 4 DESC`
  ]);
  const rows = (value: unknown) => value as Record<string, unknown>[];
  const total = rows(totals)[0] ?? {};
  return {
    days,
    opens: n(total.opens),
    clicks: n(total.clicks),
    byDay: rows(byDay).map((row) => ({ date: String(row.date), opens: n(row.opens), clicks: n(row.clicks) })),
    bySource: rows(bySource).map((row) => ({ source: String(row.source) as "qr" | "nfc" | "direct", opens: n(row.opens) })),
    byButton: rows(byButton).map((row) => ({ buttonId: String(row.button_id), buttonType: row.button_type ? String(row.button_type) : null, clicks: n(row.clicks) })),
    byWeekday: rows(byWeekday).map((row) => ({ weekday: n(row.weekday), opens: n(row.opens) })),
    byHour: rows(byHour).map((row) => ({ hour: n(row.hour), opens: n(row.opens) })),
    byDevice: rows(byDevice).map((row) => ({ device: String(row.device) as "ios" | "android" | "other", opens: n(row.opens) })),
    byStand: rows(byStand).map((row) => ({ standId: String(row.stand_id), label: String(row.label ?? ""), location: String(row.location ?? ""), opens: n(row.opens), clicks: n(row.clicks) }))
  };
}
