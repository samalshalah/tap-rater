export const internalAnalyticsCookie = "taprater_analytics_internal";
export const analyticsSessionKey = "taprater:analytics-session:v2";
export type Attribution = { source: string; medium: string; campaign?: string };
// Campaign labels only: never arbitrary query strings, IDs, email addresses, or free text.
export function campaignLabel(value: unknown): string | undefined {
  return typeof value === "string" &&
    /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value)
    ? value.toLowerCase()
    : undefined;
}
export function captureAttribution(
  search: string,
  referrer: string,
): Attribution {
  const params = new URLSearchParams(search);
  const source = campaignLabel(params.get("utm_source"));
  const medium = campaignLabel(params.get("utm_medium"));
  const campaign = campaignLabel(params.get("utm_campaign"));
  if (source && medium)
    return { source, medium, ...(campaign ? { campaign } : {}) };
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === "taprater.com" || host === "www.taprater.com")
      return { source: "direct", medium: "none" };
    const known: Record<string, string> = {
      "google.com": "google",
      "www.google.com": "google",
      "bing.com": "bing",
      "www.bing.com": "bing",
      "duckduckgo.com": "duckduckgo",
      "search.yahoo.com": "yahoo",
      "www.facebook.com": "facebook",
      "l.facebook.com": "facebook",
      "m.facebook.com": "facebook",
      "www.instagram.com": "instagram",
      "l.instagram.com": "instagram",
      "www.linkedin.com": "linkedin",
      "t.co": "twitter",
      "www.yelp.com": "yelp",
    };
    const name = known[host];
    if (name)
      return {
        source: name,
        medium: ["google", "bing", "duckduckgo", "yahoo"].includes(name)
          ? "organic"
          : "referral",
      };
    if (host) return { source: "other-referral", medium: "referral" };
  } catch {}
  return { source: "direct", medium: "none" };
}
