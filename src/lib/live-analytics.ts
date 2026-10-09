import { analyticsSql } from "@/lib/storefront-analytics-server";

export type LiveAnalytics = {
  updatedAt: string;
  active: {
    page: string;
    source: string;
    medium: string;
    device: string;
    sessions: number;
  }[];
  events: {
    id: string;
    name: string;
    page: string;
    item: string | null;
    source: string;
    device: string;
    time: string;
  }[];
};

export async function liveAnalyticsReport(): Promise<LiveAnalytics> {
  const [row] = await analyticsSql().query(
    `
    WITH eligible AS (
      SELECT * FROM storefront_analytics_sessions
      WHERE consent AND NOT excluded AND last_seen >= now()-interval '30 minutes'
    ), latest AS (
      SELECT DISTINCT ON(s.id) s.id,s.source,s.medium,s.device,e.page
      FROM eligible s JOIN storefront_analytics_events e ON e.session_id=s.id
      WHERE s.last_seen >= now()-interval '5 minutes'
      ORDER BY s.id,e.created_at DESC,e.id
    ), activity AS (
      SELECT e.id::text id,e.event_name name,e.page,e.item_id item,s.source,s.device,e.created_at time
      FROM storefront_analytics_events e JOIN eligible s ON s.id=e.session_id
      WHERE e.created_at >= now()-interval '30 minutes'
      UNION ALL
      SELECT o.id::text,'purchase','/checkout',NULL,s.source,s.device,c.purchase_at
      FROM storefront_analytics_checkouts c
      JOIN storefront_analytics_sessions s ON s.id=c.session_id
      JOIN orders o ON o.stripe_checkout_session_id=c.stripe_session_id
      WHERE s.consent AND NOT s.excluded AND c.consent AND NOT c.excluded
      AND c.purchase_at >= now()-interval '30 minutes'
      AND o.status='paid' AND o.payment_status='paid' AND c.stripe_session_id LIKE 'cs_live_%'
    )
    SELECT now() "updatedAt",
      coalesce((SELECT json_agg(a) FROM (SELECT page,source,medium,device,count(*)::int sessions FROM latest GROUP BY page,source,medium,device ORDER BY sessions DESC,page) a),'[]'::json) active,
      coalesce((SELECT json_agg(a) FROM (SELECT * FROM activity ORDER BY time DESC,id LIMIT 40) a),'[]'::json) events
  `,
    [],
  );
  return row as LiveAnalytics;
}
