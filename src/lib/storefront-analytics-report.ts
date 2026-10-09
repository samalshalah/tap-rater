import { analyticsSql } from "@/lib/storefront-analytics-server";
export async function storefrontAnalyticsReport(days: number) {
  const sql = analyticsSql();
  const [
    sessions,
    funnel,
    sources,
    landings,
    exits,
    devices,
    sales,
    orders,
    products,
  ] = await Promise.all([
    sql.query(
      "SELECT count(*)::int sessions, (SELECT count(*)::int FROM storefront_analytics_events e JOIN storefront_analytics_sessions s ON s.id=e.session_id WHERE s.created_at>=now()-make_interval(days=>$1) AND NOT s.excluded AND e.event_name='page_view') views FROM storefront_analytics_sessions WHERE created_at>=now()-make_interval(days=>$1) AND NOT excluded",
      [days],
    ),
    sql.query(
      `SELECT e.event_name,count(DISTINCT e.session_id)::int sessions FROM storefront_analytics_events e JOIN storefront_analytics_sessions s ON s.id=e.session_id WHERE s.created_at>=now()-make_interval(days=>$1) AND NOT s.excluded GROUP BY e.event_name UNION ALL SELECT 'purchase',count(DISTINCT s.id)::int FROM storefront_analytics_sessions s JOIN storefront_analytics_checkouts c ON c.session_id=s.id JOIN orders o ON o.stripe_checkout_session_id=c.stripe_session_id WHERE s.created_at>=now()-make_interval(days=>$1) AND NOT s.excluded AND NOT c.excluded AND o.status='paid' AND o.payment_status='paid' AND o.stripe_checkout_session_id LIKE 'cs_live_%'`,
      [days],
    ),
    sql.query(
      `SELECT s.source,s.medium,coalesce(s.campaign,'—') campaign,count(DISTINCT s.id)::int sessions,count(DISTINCT CASE WHEN o.payment_status='paid' AND o.status='paid' AND NOT c.excluded AND o.stripe_checkout_session_id LIKE 'cs_live_%' THEN o.id END)::int purchases FROM storefront_analytics_sessions s LEFT JOIN storefront_analytics_checkouts c ON c.session_id=s.id LEFT JOIN orders o ON o.stripe_checkout_session_id=c.stripe_session_id WHERE s.created_at>=now()-make_interval(days=>$1) AND NOT s.excluded GROUP BY 1,2,3 ORDER BY sessions DESC LIMIT 30`,
      [days],
    ),
    sql.query(
      `SELECT s.landing_page,count(DISTINCT s.id)::int sessions,count(DISTINCT CASE WHEN e.event_name='add_to_cart' THEN s.id END)::int carts,count(DISTINCT CASE WHEN o.status='paid' AND o.payment_status='paid' AND NOT c.excluded AND o.stripe_checkout_session_id LIKE 'cs_live_%' THEN o.id END)::int purchases FROM storefront_analytics_sessions s LEFT JOIN storefront_analytics_events e ON e.session_id=s.id LEFT JOIN storefront_analytics_checkouts c ON c.session_id=s.id LEFT JOIN orders o ON o.stripe_checkout_session_id=c.stripe_session_id WHERE s.created_at>=now()-make_interval(days=>$1) AND NOT s.excluded GROUP BY 1 ORDER BY sessions DESC LIMIT 30`,
      [days],
    ),
    sql.query(
      `SELECT page,event_name,count(*)::int sessions FROM (SELECT DISTINCT ON(s.id) s.id,e.page,e.event_name FROM storefront_analytics_sessions s JOIN storefront_analytics_events e ON e.session_id=s.id WHERE s.created_at>=now()-make_interval(days=>$1) AND s.last_seen<now()-interval '30 minutes' AND NOT s.excluded ORDER BY s.id,e.created_at DESC) last_pages GROUP BY page,event_name ORDER BY sessions DESC LIMIT 20`,
      [days],
    ),
    sql.query(
      `SELECT s.device,count(DISTINCT s.id)::int sessions,count(DISTINCT CASE WHEN e.event_name='begin_checkout' THEN s.id END)::int checkouts FROM storefront_analytics_sessions s LEFT JOIN storefront_analytics_events e ON e.session_id=s.id WHERE s.created_at>=now()-make_interval(days=>$1) AND NOT s.excluded GROUP BY 1`,
      [days],
    ),
    sql.query(
      `SELECT count(*)::int orders,coalesce(sum(o.total_cents),0)::bigint collected,coalesce(sum(o.refunded_amount_cents),0)::bigint refunded,count(*) FILTER(WHERE c.session_id IS NOT NULL)::int attributed,count(*) FILTER(WHERE c.sent_at IS NOT NULL)::int submitted FROM orders o LEFT JOIN storefront_analytics_checkouts c ON c.stripe_session_id=o.stripe_checkout_session_id WHERE o.created_at>=now()-make_interval(days=>$1) AND o.stripe_checkout_session_id LIKE 'cs_live_%' AND o.payment_status='paid' AND o.status IN ('paid','refunded','partially_refunded') AND NOT coalesce(c.excluded,false)`,
      [days],
    ),
    sql.query(
      `SELECT o.id,o.created_at,o.total_cents,o.status,coalesce(c.excluded,false) excluded,CASE WHEN c.excluded THEN 'Excluded test' WHEN c.sent_at IS NOT NULL THEN 'Submitted to GA4' WHEN c.ga_status='invalid_order' THEN 'Review order totals' WHEN c.ga_status='retrying' THEN 'Retrying' WHEN c.consent AND c.ga_client_id IS NOT NULL AND c.ga_session_id IS NOT NULL THEN 'Queued' ELSE 'No analytics consent / attribution' END tracking FROM orders o LEFT JOIN storefront_analytics_checkouts c ON c.stripe_session_id=o.stripe_checkout_session_id WHERE o.created_at>=now()-make_interval(days=>$1) AND o.stripe_checkout_session_id LIKE 'cs_live_%' AND o.payment_status='paid' ORDER BY o.created_at DESC LIMIT 30`,
      [days],
    ),
    sql.query(
      `SELECT item_id,count(DISTINCT CASE WHEN e.event_name='view_item' THEN s.id END)::int views,count(DISTINCT CASE WHEN e.event_name='add_to_cart' THEN s.id END)::int carts FROM storefront_analytics_events e JOIN storefront_analytics_sessions s ON s.id=e.session_id WHERE s.created_at>=now()-make_interval(days=>$1) AND NOT s.excluded AND item_id IS NOT NULL GROUP BY item_id ORDER BY views DESC LIMIT 20`,
      [days],
    ),
  ]);
  return {
    sessions: sessions[0],
    funnel,
    sources,
    landings,
    exits,
    devices,
    sales: sales[0],
    orders,
    products,
  };
}
