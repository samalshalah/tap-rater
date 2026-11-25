import { isValidHostedPageCode } from "./codes";
// Anonymous activity tags for Multi-Link pages. Shared by the public page worker and the app.
export type HostedPageSource = "qr" | "nfc" | "direct";
export type HostedPageDevice = "ios" | "android" | "other";
export type HostedPageTracking = { source: HostedPageSource; standId?: string };

const standIdPattern = /^ST-[A-Za-z0-9-]{4,80}$/;
export const hostedPageEventsPath = "/api/hosted-pages/events";
/** Ended pages with a forwarding link go through here so the visit is counted (see the route). */
export const hostedPageForwardPath = "/api/hosted-pages/forward";
/** How a forwarded visit shows in Insights: as a tap on this "link". */
export const forwardedButtonId = "forwarded";

/** Where /p/CODE sends an ended page with a forwarding link, keeping the stand tags. */
export function hostedPageForwardStepUrl(code: string, tracking: HostedPageTracking) {
  const params = new URLSearchParams({ c: code, s: tracking.source });
  if (tracking.standId) params.set("st", tracking.standId);
  return `${hostedPageForwardPath}?${params.toString()}`;
}

export function isValidStandId(value: string | null | undefined): value is string {
  return Boolean(value && standIdPattern.test(value));
}

export function readHostedPageSource(value: string | null | undefined): HostedPageSource {
  return value === "qr" || value === "nfc" ? value : "direct";
}

/** Reads ?s=qr|nfc and ?st=<stand ID> from a page URL. */
export function readHostedPageTracking(url: URL): HostedPageTracking {
  const standId = url.searchParams.get("st");
  return { source: readHostedPageSource(url.searchParams.get("s")), standId: isValidStandId(standId) ? standId : undefined };
}

/** The link printed on a stand: tells taps (nfc) from scans (qr), and which stand it was. */
export function taggedHostedPageUrl(pageUrl: string, source: Exclude<HostedPageSource, "direct">, standId?: string) {
  const url = new URL(pageUrl);
  url.searchParams.set("s", source);
  if (isValidStandId(standId)) url.searchParams.set("st", standId);
  else url.searchParams.delete("st");
  return url.toString();
}

export function hostedPageEventUrl(event: { type: "view" | "click"; code: string; tracking: HostedPageTracking; buttonId?: string; buttonType?: string }) {
  const params = new URLSearchParams({ e: event.type, c: event.code, s: event.tracking.source });
  if (event.tracking.standId) params.set("st", event.tracking.standId);
  if (event.buttonId) params.set("b", event.buttonId);
  if (event.buttonType) params.set("t", event.buttonType);
  return `${hostedPageEventsPath}?${params.toString()}`;
}

export function classifyHostedPageDevice(userAgent: string | null | undefined): HostedPageDevice {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export function isLikelyBot(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  return !ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|curl|wget|python|headless|monitor/i.test(ua);
}

export type ParsedHostedPageEvent = { type: "view" | "click"; code: string; source: string; standId: string | null; buttonId: string | null; buttonType: string | null };

export function parseHostedPageEvent(url: URL): ParsedHostedPageEvent | null {
  const type = url.searchParams.get("e");
  const code = url.searchParams.get("c") ?? "";
  if ((type !== "view" && type !== "click") || !isValidHostedPageCode(code)) return null;
  const standId = url.searchParams.get("st");
  const buttonId = url.searchParams.get("b");
  const buttonType = url.searchParams.get("t");
  if (type === "click" && !(buttonId && /^[A-Za-z0-9_-]{1,100}$/.test(buttonId))) return null;
  return {
    type, code,
    source: readHostedPageSource(url.searchParams.get("s")),
    standId: isValidStandId(standId) ? standId : null,
    buttonId: type === "click" ? buttonId : null,
    buttonType: type === "click" && buttonType && /^[a-z_]{1,40}$/.test(buttonType) ? buttonType : null
  };
}


/**
 * For a Tap Rater page link (taprater.com/p/CODE), returns the link to print or program on a
 * stand, tagged as a QR scan or an NFC tap. Any other link is returned unchanged.
 */
export function standTargetUrl(destinationUrl: string, source: Exclude<HostedPageSource, "direct">, standId?: string) {
  try {
    const url = new URL(destinationUrl);
    const isHostedPage = url.hostname === "taprater.com" && /^\/p\/[A-HJKMNPQRSTVWXYZ2-9]{12}\/?$/.test(url.pathname) && !url.search;
    return isHostedPage ? taggedHostedPageUrl(destinationUrl, source, standId) : destinationUrl;
  } catch {
    return destinationUrl;
  }
}
