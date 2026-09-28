import { analyticsPage, analyticsReferrer, consentStorageKey, readConsent, type AnalyticsConfig, type ConsentChoice, type EcommerceData, type EcommerceEvent, type PurchaseData } from "@/lib/storefront-analytics";

type AnalyticsWindow = Window & { tapRaterDataLayer?: unknown[]; [key: `ga-disable-${string}`]: boolean };
let activeConfig: AnalyticsConfig = { measurementId: null, origin: "https://taprater.com" };
let loadedId: string | null = null;
let ready = false;
let enabled = false;
let forcedDenied = false;
const sentPurchases = new Set<string>();

export function browserConsent() {
  try {
    if (forcedDenied) return "denied";
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return "denied";
    return readConsent(localStorage.getItem(consentStorageKey));
  } catch { return null; }
}

export function saveBrowserConsent(choice: ConsentChoice) {
  forcedDenied = true;
  enabled = false;
  if (loadedId) (window as unknown as AnalyticsWindow)[`ga-disable-${loadedId}`] = true;
  try {
    localStorage.setItem(consentStorageKey, JSON.stringify({ version: 1, choice, savedAt: Date.now() }));
    forcedDenied = false;
    return true;
  } catch { clearAnalyticsCookies(); return false; }
}

function command(..._args: unknown[]) {
  const target = window as unknown as AnalyticsWindow;
  target.tapRaterDataLayer ??= [];
  target.tapRaterDataLayer.push(arguments);
}

function context() {
  const page = analyticsPage(window.location.pathname);
  if (!page) return null;
  return { page_location: `${activeConfig.origin}${page.path}`, page_title: page.title, page_referrer: analyticsReferrer(document.referrer) };
}

export function analyticsAvailable() {
  return enabled && ready && browserConsent() === "granted" && Boolean(context());
}

function clearAnalyticsCookies() {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.trim().split("=")[0];
    if (!/^_ga(?:_|$)/.test(name)) continue;
    for (const domain of ["", window.location.hostname, ".taprater.com"]) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}

export function syncAnalytics(config: AnalyticsConfig, onReady: () => void) {
  activeConfig = config;
  const target = window as unknown as AnalyticsWindow;
  const id = config.measurementId;
  const permitted = Boolean(id && window.location.origin === config.origin && browserConsent() === "granted" && context());
  enabled = permitted;
  if (id) target[`ga-disable-${id}`] = !permitted;
  if (loadedId && loadedId !== id) target[`ga-disable-${loadedId}`] = true;
  if (!permitted || !id) {
    if (loadedId) command("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    if (browserConsent() !== "granted") clearAnalyticsCookies();
    return;
  }
  const page = context();
  command("set", page);
  if (loadedId === id) {
    command("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    if (ready) onReady();
    return;
  }
  loadedId = id;
  ready = false;
  command("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  command("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  command("set", "ads_data_redaction", true);
  command("set", "url_passthrough", false);
  command("js", new Date());
  command("config", id, {
    ...page, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
    cookie_domain: "none", cookie_flags: "SameSite=Lax;Secure", cookie_expires: 60 * 60 * 24 * 180
  });
  const script = document.createElement("script");
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}&l=tapRaterDataLayer`;
  script.onload = () => { ready = true; if (analyticsAvailable()) onReady(); };
  script.onerror = () => { ready = false; };
  document.head.appendChild(script);
}

export function trackPageView() {
  if (!analyticsAvailable()) return false;
  command("event", "page_view", { ...context(), send_to: activeConfig.measurementId });
  return true;
}

export function trackEcommerce(name: EcommerceEvent, data: EcommerceData) {
  if (!analyticsAvailable() || !data.items.length) return false;
  // Copy only the approved schema, never a cart setup or form object.
  command("event", name, {
    ...context(), send_to: activeConfig.measurementId, currency: data.currency, value: data.value,
    items: data.items.map(({ item_id, item_variant, price, quantity }) => ({ item_id, item_variant, price, quantity }))
  });
  return true;
}

export async function trackPurchase(data: PurchaseData) {
  const key = `taprater:ga4-purchase:${activeConfig.measurementId}:${data.transaction_id}`;
  const send = () => {
    if (!analyticsAvailable() || sentPurchases.has(key)) return false;
    try {
      if (localStorage.getItem(key)) return false;
      // Reserve before dispatch. A stable transaction_id also lets GA4 deduplicate across browsers.
      localStorage.setItem(key, "sent");
    } catch { return false; }
    sentPurchases.add(key);
    command("event", "purchase", {
      ...context(), send_to: activeConfig.measurementId,
      transaction_id: data.transaction_id, currency: data.currency, value: data.value, tax: data.tax, shipping: data.shipping,
      items: data.items.map(({ item_id, item_variant, price, quantity }) => ({ item_id, item_variant, price, quantity }))
    });
    return true;
  };
  try {
    return navigator.locks ? await navigator.locks.request(key, send) : send();
  } catch { return false; }
}
