import { timingSafeEqual } from "node:crypto";
import {
  analyticsSql,
  flushAnalyticsPurchases,
} from "@/lib/storefront-analytics-server";
export async function POST(request: Request) {
  const expected = process.env.ADMIN_SESSION_SECRET,
    actual = request.headers.get("x-internal-secret");
  if (
    !expected ||
    !actual ||
    Buffer.byteLength(expected) !== Buffer.byteLength(actual) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  )
    return new Response(null, { status: 401 });
  const result = await flushAnalyticsPurchases();
  await analyticsSql().query(
    "DELETE FROM storefront_analytics_sessions WHERE created_at<now()-interval '90 days'",
    [],
  );
  await analyticsSql().query(
    "UPDATE storefront_analytics_checkouts SET ga_client_id=NULL,ga_session_id=NULL,consent=false WHERE created_at<now()-interval '90 days' AND ga_client_id IS NOT NULL",
    [],
  );
  return Response.json(result);
}
