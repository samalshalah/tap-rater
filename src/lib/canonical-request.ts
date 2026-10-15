import { getCanonicalProductSlug } from "./product-slug-aliases";

const canonicalHost = "taprater.com";
const canonicalOrigin = `https://${canonicalHost}`;
const productionHosts = new Set([canonicalHost, `www.${canonicalHost}`]);

export function getCanonicalRedirectUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const urlHost = requestUrl.hostname.toLowerCase();
  const headerHost = normalizeHost(request.headers.get("host"));
  const authoritativeHost = productionHosts.has(urlHost) ? urlHost : productionHosts.has(headerHost) ? headerHost : "";
  const host = authoritativeHost || normalizeHost(request.headers.get("x-forwarded-host")) || headerHost || urlHost;
  const protocol = authoritativeHost
    ? requestUrl.protocol.replace(":", "").toLowerCase()
    : firstHeaderValue(request.headers.get("x-forwarded-proto")) || requestUrl.protocol.replace(":", "").toLowerCase();

  const productMatch = requestUrl.pathname.match(/^\/product\/([^/]+)\/?$/);
  const canonicalSlug = productMatch ? getCanonicalProductSlug(productMatch[1]) : undefined;
  const legacyProduct = productMatch && canonicalSlug !== productMatch[1];
  if (!productionHosts.has(host) || (host === canonicalHost && protocol === "https" && !legacyProduct)) {
    return undefined;
  }

  const pathname = legacyProduct ? `/product/${canonicalSlug}` : requestUrl.pathname;
  return new URL(`${pathname}${requestUrl.search}`, canonicalOrigin);
}

function normalizeHost(value: string | null) {
  return firstHeaderValue(value).replace(/:\d+$/u, "");
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() ?? "";
}
