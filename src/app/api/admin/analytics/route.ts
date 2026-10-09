import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import {
  analyticsSql,
  flushAnalyticsPurchases,
} from "@/lib/storefront-analytics-server";
import { internalAnalyticsCookie } from "@/lib/analytics-attribution";
import { z } from "zod";
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.action === "exclude-browser") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(internalAnalyticsCookie, "1", {
      path: "/",
      maxAge: 31536000,
      secure: true,
      sameSite: "lax",
    });
    return res;
  }
  if (
    body?.action === "order-exclusion" &&
    z.string().uuid().safeParse(body.orderId).success &&
    typeof body.excluded === "boolean"
  ) {
    await analyticsSql().query(
      `INSERT INTO storefront_analytics_checkouts(stripe_session_id,excluded) SELECT stripe_checkout_session_id,$2 FROM orders WHERE id=$1 ON CONFLICT(stripe_session_id) DO UPDATE SET excluded=$2`,
      [body.orderId, body.excluded],
    );
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "retry") {
    return NextResponse.json(await flushAnalyticsPurchases());
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
