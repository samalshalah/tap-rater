import { liveDb } from "@/lib/google-business/live-reviews";
import { classifyHostedPageDevice, isLikelyBot, parseHostedPageEvent } from "@/lib/hosted-pages/tracking";
import { checkPublicRateLimit } from "@/lib/public-rate-limit";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF returned for page-open pixels.
const pixel = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));
const noStore = { "Cache-Control": "no-store, max-age=0" };

// Records one anonymous event. Only codes that exist and are not retired are counted.
async function record(request: Request) {
  const event = parseHostedPageEvent(new URL(request.url));
  const userAgent = request.headers.get("user-agent");
  if (!event || isLikelyBot(userAgent)) return;
  if ((await checkPublicRateLimit(request, "hosted-page-event", "PUBLIC_EVENT_RATE_LIMITER")).limited) return;
  try {
    await liveDb()`INSERT INTO hosted_page_events(code,event_type,source,button_id,button_type,device,stand_id)
      SELECT ${event.code},${event.type},${event.source},${event.buttonId},${event.buttonType},${classifyHostedPageDevice(userAgent)},${event.standId}
      WHERE EXISTS(SELECT 1 FROM hosted_page_codes WHERE code=${event.code} AND retired_at IS NULL)`;
  } catch (error) {
    console.error("Hosted page event not recorded", error instanceof Error ? error.message : error);
  }
}

// Page open (image pixel). Always answers with the pixel so the page never shows a broken image.
export async function GET(request: Request) {
  await record(request);
  return new Response(pixel, { headers: { ...noStore, "Content-Type": "image/gif" } });
}

// Link click (sent by the browser's <a ping>, which posts as text/ping).
export async function POST(request: Request) {
  await record(request);
  return new Response(null, { status: 204, headers: noStore });
}
