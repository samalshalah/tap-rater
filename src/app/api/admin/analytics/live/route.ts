import { requireAdminApi } from "@/lib/admin-auth";
import { liveAnalyticsReport } from "@/lib/live-analytics";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const headers = { "Cache-Control": "private, no-store" };
  try {
    return Response.json(await liveAnalyticsReport(), { headers });
  } catch {
    return Response.json(
      { error: "Live activity is temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
