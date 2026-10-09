import {
  captureAttribution,
  analyticsSessionKey,
  internalAnalyticsCookie,
  type Attribution,
} from "@/lib/analytics-attribution";
import {
  analyticsPage,
  analyticsReferrer,
  consentStorageKey,
  readConsent,
  type AnalyticsConfig,
  type ConsentChoice,
  type EcommerceData,
  type EcommerceEvent,
  type PurchaseData,
} from "@/lib/storefront-analytics";

type AnalyticsWindow = Window & {
  tapRaterDataLayer?: unknown[];
  [key: `ga-disable-${string}`]: boolean;
};
let activeConfig: AnalyticsConfig = {
  measurementId: null,
  origin: "https://taprater.com",
};
let loadedId: string | null = null;
let ready = false;
let enabled = false;
let entry: { path: string; attribution: Attribution } | null = null;
type Visit = {
  id: string;
  lastSeen: number;
  landing: string;
  attribution: Attribution;
};
export function captureAnalyticsEntry() {
  if (!entry && analyticsPage(window.location.pathname))
    entry = {
      path: analyticsPage(window.location.pathname)!.path,
      attribution: captureAttribution(
        window.location.search,
        document.referrer,
      ),
    };
}
export function isInternalAnalyticsBrowser() {
  return document.cookie
    .split(";")
    .some((v) => v.trim() === internalAnalyticsCookie + "=1");
}
function visit(): Visit | null {
  if (browserConsent() !== "granted" || isInternalAnalyticsBrowser())
    return null;
  captureAnalyticsEntry();
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(analyticsSessionKey) || "null",
    ) as Visit | null;
    if (saved && Date.now() - saved.lastSeen >= 30 * 60 * 1000) {
      entry = {
        path: analyticsPage(window.location.pathname)?.path || "/",
        attribution: { source: "direct", medium: "none" },
      };
    }
    const current =
      saved && Date.now() - saved.lastSeen < 30 * 60 * 1000
        ? saved
        : {
            id: crypto.randomUUID(),
            lastSeen: Date.now(),
            landing: entry?.path || "/",
            attribution: entry?.attribution || {
              source: "direct",
              medium: "none",
            },
          };
    current.lastSeen = Date.now();
    sessionStorage.setItem(analyticsSessionKey, JSON.stringify(current));
    return current;
  } catch {
    return null;
  }
}
function recordJourney(name: string, itemId?: string) {
  const session = visit(),
    page = analyticsPage(window.location.pathname);
  if (!session || !page || window.location.origin !== activeConfig.origin)
    return;
  void fetch("/api/site/analytics-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      id: crypto.randomUUID(),
      sessionId: session.id,
      name,
      page: page.path,
      landing: session.landing,
      ...session.attribution,
      device: /iPad|Tablet/i.test(navigator.userAgent)
        ? "tablet"
        : /Mobi|Android/i.test(navigator.userAgent)
          ? "mobile"
          : "desktop",
      ...(itemId ? { itemId } : {}),
    }),
  }).catch(() => {});
}
export function trackCheckoutStep(
  name:
    | "add_shipping_info"
    | "payment_step"
    | "add_payment_info"
    | "checkout_error"
    | "payment_error",
) {
  if (!analyticsAvailable()) return;
  command("event", name, { ...context(), send_to: activeConfig.measurementId });
  recordJourney(name);
}
export async function checkoutAnalyticsHeaders(): Promise<
  Record<string, string>
> {
  if (!analyticsAvailable()) return {};
  // Ensure the first-party session exists before associating a verified payment with it.
  const session = visit();
  if (!session) return {};
  const get = (field: string) =>
    new Promise<string | undefined>((resolve) => {
      const timer = setTimeout(() => resolve(undefined), 800);
      command("get", activeConfig.measurementId, field, (value: unknown) => {
        clearTimeout(timer);
        resolve(
          typeof value === "string" || typeof value === "number"
            ? String(value)
            : undefined,
        );
      });
    });
  const [clientId, gaSessionId] = await Promise.all([
    get("client_id"),
    get("session_id"),
  ]);
  return {
    "x-taprater-analytics": JSON.stringify({
      sessionId: session.id,
      clientId,
      gaSessionId,
      entry: {
        ...session.attribution,
        landing: session.landing,
        device: /iPad|Tablet/i.test(navigator.userAgent)
          ? "tablet"
          : /Mobi|Android/i.test(navigator.userAgent)
            ? "mobile"
            : "desktop",
      },
    }),
  };
}

let forcedDenied = false;
const sentPurchases = new Set<string>();

export function browserConsent() {
  try {
    if (forcedDenied || isInternalAnalyticsBrowser()) return "denied";
    if (
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    )
      return "denied";
    return readConsent(localStorage.getItem(consentStorageKey));
  } catch {
    return null;
  }
}

export function saveBrowserConsent(choice: ConsentChoice) {
  document.cookie =
    "taprater_analytics_consent=" +
    choice +
    "; Path=/; Max-Age=15552000; SameSite=Lax; Secure";
  if (choice === "denied") {
    try {
      const session = JSON.parse(
        sessionStorage.getItem(analyticsSessionKey) || "null",
      );
      if (session?.id)
        void fetch("/api/site/analytics-events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ sessionId: session.id }),
        }).catch(() => {});
      sessionStorage.removeItem(analyticsSessionKey);
    } catch {}
  }
  forcedDenied = true;
  enabled = false;
  if (loadedId)
    (window as unknown as AnalyticsWindow)[`ga-disable-${loadedId}`] = true;
  try {
    localStorage.setItem(
      consentStorageKey,
      JSON.stringify({ version: 1, choice, savedAt: Date.now() }),
    );
    forcedDenied = false;
    return true;
  } catch {
    clearAnalyticsCookies();
    return false;
  }
}

function command(..._args: unknown[]) {
  const target = window as unknown as AnalyticsWindow;
  target.tapRaterDataLayer ??= [];
  target.tapRaterDataLayer.push(arguments);
}

function context() {
  const page = analyticsPage(window.location.pathname);
  if (!page) return null;
  const attribution = visit()?.attribution;
  return {
    ...(attribution
      ? {
          campaign_source: attribution.source,
          campaign_medium: attribution.medium,
          ...(attribution.campaign
            ? { campaign_name: attribution.campaign }
            : {}),
        }
      : {}),
    page_location: `${activeConfig.origin}${page.path}`,
    page_title: page.title,
    page_referrer: analyticsReferrer(document.referrer),
  };
}

export function analyticsAvailable() {
  return (
    enabled && ready && browserConsent() === "granted" && Boolean(context())
  );
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
  captureAnalyticsEntry();
  if (browserConsent() === "granted")
    document.cookie =
      "taprater_analytics_consent=granted; Path=/; Max-Age=15552000; SameSite=Lax; Secure";
  const target = window as unknown as AnalyticsWindow;
  const id = config.measurementId;
  const permitted = Boolean(
    id &&
      window.location.origin === config.origin &&
      browserConsent() === "granted" &&
      context(),
  );
  enabled = permitted;
  if (id) target[`ga-disable-${id}`] = !permitted;
  if (loadedId && loadedId !== id) target[`ga-disable-${loadedId}`] = true;
  if (!permitted || !id) {
    if (loadedId)
      command("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    if (browserConsent() !== "granted") clearAnalyticsCookies();
    return;
  }
  const page = context();
  command("set", page);
  if (loadedId === id) {
    command("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    if (ready) onReady();
    return;
  }
  loadedId = id;
  ready = false;
  command("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  command("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  command("set", "ads_data_redaction", true);
  command("set", "url_passthrough", false);
  command("js", new Date());
  command("config", id, {
    ...page,
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: "none",
    cookie_flags: "SameSite=Lax;Secure",
    cookie_expires: 60 * 60 * 24 * 180,
  });
  const script = document.createElement("script");
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}&l=tapRaterDataLayer`;
  script.onload = () => {
    ready = true;
    if (analyticsAvailable()) onReady();
  };
  script.onerror = () => {
    ready = false;
  };
  document.head.appendChild(script);
}

export function trackPageView() {
  if (!analyticsAvailable()) return false;
  command("event", "page_view", {
    ...context(),
    send_to: activeConfig.measurementId,
  });
  recordJourney("page_view");
  return true;
}

export function trackEcommerce(name: EcommerceEvent, data: EcommerceData) {
  if (!analyticsAvailable() || !data.items.length) return false;
  for (const item of data.items) recordJourney(name, item.item_id);
  // Copy only the approved schema, never a cart setup or form object.
  command("event", name, {
    ...context(),
    send_to: activeConfig.measurementId,
    currency: data.currency,
    value: data.value,
    items: data.items.map(({ item_id, item_variant, price, quantity }) => ({
      item_id,
      item_variant,
      price,
      quantity,
    })),
  });
  return true;
}

export async function trackPurchase(data: PurchaseData) {
  if (activeConfig.serverPurchases) return false;
  const key = `taprater:ga4-purchase:${activeConfig.measurementId}:${data.transaction_id}`;
  const send = () => {
    if (!analyticsAvailable() || sentPurchases.has(key)) return false;
    try {
      if (localStorage.getItem(key)) return false;
      // Reserve before dispatch. A stable transaction_id also lets GA4 deduplicate across browsers.
      localStorage.setItem(key, "sent");
    } catch {
      return false;
    }
    sentPurchases.add(key);
    command("event", "purchase", {
      ...context(),
      send_to: activeConfig.measurementId,
      transaction_id: data.transaction_id,
      currency: data.currency,
      value: data.value,
      tax: data.tax,
      shipping: data.shipping,
      items: data.items.map(({ item_id, item_variant, price, quantity }) => ({
        item_id,
        item_variant,
        price,
        quantity,
      })),
    });
    return true;
  };
  try {
    return navigator.locks ? await navigator.locks.request(key, send) : send();
  } catch {
    return false;
  }
}
