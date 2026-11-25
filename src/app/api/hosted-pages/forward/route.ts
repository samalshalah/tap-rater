import { liveDb } from "@/lib/google-business/live-reviews";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { isValidHostedPageCode } from "@/lib/hosted-pages/codes";
import { readCurrentHostedPageSnapshot } from "@/lib/hosted-pages/repository";
import { hostedPageForwardUrl, renderHostedPageHtml, resolveHostedPageLifecycle } from "@/lib/hosted-pages/snapshots";
import { classifyHostedPageDevice, forwardedButtonId, isLikelyBot, readHostedPageTracking, type HostedPageTracking } from "@/lib/hosted-pages/tracking";
import { checkPublicRateLimit } from "@/lib/public-rate-limit";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex" };

/**
 * An ended page with a forwarding link sends visitors here first (from /p/CODE), so the visit is
 * counted in Insights with the visitor's own device, then on to the link. The link is read from
 * the page itself, never from the URL, so this can't be used to redirect anywhere else.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("c") ?? "";
  if (!isValidHostedPageCode(code)) return new Response("Not found", { status: 404, headers: noStore });

  const storage = await getHostedPageStorage();
  const snapshot = storage ? await readCurrentHostedPageSnapshot(storage, code).catch(() => null) : null;
  const resolution = snapshot ? resolveHostedPageLifecycle(snapshot) : { state: "not_found" as const };
  const forward = hostedPageForwardUrl(resolution);
  if (!forward) {
    return new Response(renderHostedPageHtml(resolution), { status: snapshot ? 200 : 404, headers: { ...noStore, "Content-Type": "text/html; charset=utf-8" } });
  }

  await recordForwardedVisit(request, code, readHostedPageTracking(url))
    .catch((error) => console.error("Forwarded visit not recorded", error instanceof Error ? error.message : error));
  return new Response(null, { status: 302, headers: { ...noStore, Location: forward } });
}

/** One visit (a page open) plus where it went (the forwarding link), like a tap on a page link. */
async function recordForwardedVisit(request: Request, code: string, tracking: HostedPageTracking) {
  const userAgent = request.headers.get("user-agent");
  if (isLikelyBot(userAgent)) return;
  if ((await checkPublicRateLimit(request, "hosted-page-event", "PUBLIC_EVENT_RATE_LIMITER")).limited) return;
  const device = classifyHostedPageDevice(userAgent), standId = tracking.standId ?? null;
  await liveDb()`INSERT INTO hosted_page_events(code,event_type,source,button_id,button_type,device,stand_id)
    SELECT ${code},v.type,${tracking.source},v.button_id,v.button_type,${device},${standId}
    FROM (VALUES ('view',NULL::text,NULL::text),('click',${forwardedButtonId}::text,'forward'::text)) AS v(type,button_id,button_type)
    WHERE EXISTS(SELECT 1 FROM hosted_page_codes WHERE code=${code} AND retired_at IS NULL)`;
}
