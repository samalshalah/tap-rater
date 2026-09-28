import { NextResponse } from "next/server";
import { getAnalyticsConfig } from "@/lib/storefront-analytics";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getAnalyticsConfig(), { headers: { "Cache-Control": "no-store" } });
}
