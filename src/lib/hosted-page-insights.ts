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
  /** Per page, when several pages (locations) are counted together. */
  byPage: { code: string; opens: number; clicks: number }[];
};

export function readInsightRange(value: string | null | undefined): InsightRange {
  const days = Number(value);
  return (insightRanges as readonly number[]).includes(days) ? (days as InsightRange) : 30;
}

type Sql = ReturnType<typeof liveDb>;
const n = (value: unknown) => Number(value ?? 0);

// Anonymous counts for one Multi-Link page, or several together (a business's locations), over the last N days.
export async function getHostedPageInsights(codeOrCodes: string | string[], days: InsightRange, sql: Sql = liveDb()): Promise<HostedPageInsights> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const codes = [...new Set(Array.isArray(codeOrCodes) ? codeOrCodes : [codeOrCodes])];
  const [totals, byDay, bySource, byButton, byWeekday, byHour, byDevice, byStand, byPage] = await Promise.all([
    sql`SELECT count(*) FILTER (WHERE event_type='view') AS opens, count(*) FILTER (WHERE event_type='click') AS clicks
      FROM hosted_page_events WHERE code = ANY(${codes}::text[]) AND created_at>=${since}::timestamptz`,
    sql`SELECT to_char(created_at AT TIME ZONE ${insightTimeZone},'YYYY-MM-DD') AS date,
        count(*) FILTER (WHERE event_type='view') AS opens, count(*) FILTER (WHERE event_type='click') AS clicks
      FROM hosted_page_events WHERE code = ANY(${codes}::text[]) AND created_at>=${since}::timestamptz GROUP BY 1 ORDER BY 1`,
    sql`SELECT source, count(*) AS opens FROM hosted_page_events WHERE code = ANY(${codes}::text[]) AND event_type='view' AND created_at>=${since}::timestamptz GROUP BY 1`,
    sql`SELECT button_id, max(button_type) AS button_type, count(*) AS clicks FROM hosted_page_events
      WHERE code = ANY(${codes}::text[]) AND event_type='click' AND created_at>=${since}::timestamptz GROUP BY 1 ORDER BY 3 DESC`,
    sql`SELECT extract(dow FROM created_at AT TIME ZONE ${insightTimeZone})::int AS weekday, count(*) AS opens FROM hosted_page_events
      WHERE code = ANY(${codes}::text[]) AND event_type='view' AND created_at>=${since}::timestamptz GROUP BY 1`,
    sql`SELECT extract(hour FROM created_at AT TIME ZONE ${insightTimeZone})::int AS hour, count(*) AS opens FROM hosted_page_events
      WHERE code = ANY(${codes}::text[]) AND event_type='view' AND created_at>=${since}::timestamptz GROUP BY 1`,
    sql`SELECT device, count(*) AS opens FROM hosted_page_events WHERE code = ANY(${codes}::text[]) AND event_type='view' AND created_at>=${since}::timestamptz GROUP BY 1`,
    // Stand names and locations come from the client's own stand labels and business assignments.
    sql`SELECT e.stand_id, coalesce(nullif(r.draft_label,''),'') AS label, coalesce(b.business_name,'') AS location,
        count(*) FILTER (WHERE e.event_type='view') AS opens, count(*) FILTER (WHERE e.event_type='click') AS clicks
      FROM hosted_page_events e LEFT JOIN customer_stand_registry r ON r.public_id=e.stand_id LEFT JOIN businesses b ON b.id=r.draft_business_id
      WHERE e.code = ANY(${codes}::text[]) AND e.stand_id IS NOT NULL AND e.created_at>=${since}::timestamptz
      GROUP BY 1,2,3 ORDER BY 4 DESC`,
    sql`SELECT code, count(*) FILTER (WHERE event_type='view') AS opens, count(*) FILTER (WHERE event_type='click') AS clicks
      FROM hosted_page_events WHERE code = ANY(${codes}::text[]) AND created_at>=${since}::timestamptz GROUP BY 1 ORDER BY 2 DESC`
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
    byStand: rows(byStand).map((row) => ({ standId: String(row.stand_id), label: String(row.label ?? ""), location: String(row.location ?? ""), opens: n(row.opens), clicks: n(row.clicks) })),
    byPage: rows(byPage).map((row) => ({ code: String(row.code), opens: n(row.opens), clicks: n(row.clicks) }))
  };
}

/**
 * For several pages together: each page's links have their own IDs, so the same link
 * ("Google Review") on every location is added up under its name.
 */
export function mergeButtonsByLabel(byButton: HostedPageInsights["byButton"], labels: Record<string, string>) {
  const merged = new Map<string, { buttonId: string; buttonType: string | null; clicks: number }>();
  for (const row of byButton) {
    const label = labels[row.buttonId] ?? (row.buttonId === "forwarded" ? "forwarded" : row.buttonType ?? "Link");
    const key = row.buttonId === "forwarded" ? "forwarded" : `label:${label}`;
    const current = merged.get(key);
    merged.set(key, { buttonId: key, buttonType: row.buttonType, clicks: (current?.clicks ?? 0) + row.clicks });
  }
  return [...merged.values()].sort((a, b) => b.clicks - a.clicks);
}
