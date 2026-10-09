import { NextResponse } from "next/server";
import { getAnalyticsConfig } from "@/lib/storefront-analytics";
import { requestIsInternal } from "@/lib/storefront-analytics-server";
import { internalAnalyticsCookie } from "@/lib/analytics-attribution";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const internal = requestIsInternal(request);
  const response = NextResponse.json(
    {
      ...getAnalyticsConfig(),
      ...(internal ? { measurementId: null, internal: true } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  if (internal)
    response.cookies.set(internalAnalyticsCookie, "1", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: true,
    });
  return response;
}
