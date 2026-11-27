import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsPage, analyticsReferrer, cartAnalyticsItems, consentMaxAge, consentStorageKey, ecommerceData, getAnalyticsConfig, readConsent, analyticsItemName } from "@/lib/storefront-analytics";
import { verifiedPurchase } from "@/lib/analytics-purchase";
import { analyticsSessionKey, campaignStorageKey, campaignMaxAge } from "@/lib/analytics-attribution";

const order = () => ({
  id: "4cca14ff-8016-49c8-8c3b-b61a88b3a8e0", stripe_checkout_session_id: "cs_live_example123",
  status: "paid", payment_status: "paid", currency: "usd", total_cents: 5334, shipping_amount_cents: 1200,
  customer_details_json: { email: "private@example.com", tax_summary: { amount_cents: 234 } },
  line_items_json: [{ productId: "google-review-stand", optionId: "standard_direct", quantity: 1, unitAmountCents: 3900, lineSubtotalCents: 3900,
    setup: { businessName: "Private Business", destinationUrl: "https://private.example.com", logoStorageKey: "private/logo" } }]
});

describe("analytics configuration and consent", () => {
  it("fails closed until ID, enablement and manual measurement checks are present", () => {
    expect(getAnalyticsConfig({}).measurementId).toBeNull();
    expect(getAnalyticsConfig({ GA4_MEASUREMENT_ID: "G-EXAMPLE123", GA4_ENABLED: "true" }).measurementId).toBeNull();
    expect(getAnalyticsConfig({ GA4_MEASUREMENT_ID: "G-EXAMPLE123", GA4_ENABLED: "true", GA4_MANUAL_EVENTS_CONFIRMED: "true" }).measurementId).toBe("G-EXAMPLE123");
    expect(getAnalyticsConfig({ GA4_MEASUREMENT_ID: "G-X<script>", GA4_ENABLED: "true", GA4_MANUAL_EVENTS_CONFIRMED: "true" }).measurementId).toBeNull();
  });
  it("rejects corrupt, future-dated, expired or old-version consent", () => {
    const now = Date.now();
    expect(readConsent("bad", now)).toBeNull();
    for (const value of [{ version: 0, choice: "granted", savedAt: now }, { version: 1, choice: "yes", savedAt: now },
      { version: 1, choice: "granted", savedAt: now + 1 }, { version: 1, choice: "granted", savedAt: now - consentMaxAge }]) {
      expect(readConsent(JSON.stringify(value), now)).toBeNull();
    }
    expect(readConsent(JSON.stringify({ version: 1, choice: "denied", savedAt: now }), now)).toBe("denied");
  });
  it.each(["/admin", "/admin/orders/abc", "/account", "/account/orders", "/p/secret", "/l/secret", "/r/secret", "/activate", "/api/orders", "/unknown-user", "/shop?email=private@example.com", "/product/private@example.com"])("excludes %s", (path) => {
    expect(analyticsPage(path)).toBeNull();
  });
  it("preserves known category and business landing pages and admits public products", () => {
    expect(analyticsPage("/category/reviews")?.path).toBe("/category/reviews");
    expect(analyticsPage("/business/restaurant-food")?.path).toBe("/business/restaurant-food");
    expect(analyticsPage("/business/healthcare-dental")?.path).toBe("/business/healthcare-dental");
    expect(analyticsPage("/category")?.path).toBe("/category");
    expect(analyticsPage("/business/private-client")?.path).toBe("/business");
    expect(analyticsPage("/product/google-review-stand")?.path).toBe("/product/google-review-stand");
  });
  it("preserves known search attribution without search queries or arbitrary private referring URLs", () => {
    expect(analyticsReferrer("https://www.google.com/search?q=private@example.com")).toBe("https://www.google.com/");
    expect(analyticsReferrer("https://private-client.example.com/account/token")).toBe("");
    expect(analyticsReferrer("https://www.google.com.evil.test/search")).toBe("");
  });
  it("never copies customization, URLs or arbitrary snapshot text into ecommerce events", () => {
    const items = cartAnalyticsItems([{ productId: "google-review-stand", optionId: "standard_direct", quantity: 2,
      setup: { businessName: "Private Business", destinationUrl: "https://private.example.com", priceCents: 1, logoStorageKey: "private/logo" } }]);
    expect(items).toEqual([{ item_id: "google-review-stand", item_name: analyticsItemName("google-review-stand"), item_variant: "standard_direct", price: 39, quantity: 2 }]);
    expect(ecommerceData(items).value).toBe(78);
  });
});

describe("verified purchase payload", () => {
  it("uses persisted amounts, excludes tax/shipping from value and excludes customer details", () => {
    const result = verifiedPurchase(order());
    expect(result).toEqual({ transaction_id: order().id, currency: "USD", value: 39, tax: 2.34, shipping: 12,
      items: [{ item_id: "google-review-stand", item_name: analyticsItemName("google-review-stand"), item_variant: "standard_direct", price: 39, quantity: 1 }] });
    expect(JSON.stringify(result)).not.toMatch(/private|cs_live|logo|businessName/i);
  });
  it.each([
    { status: "pending_payment" }, { payment_status: "unpaid" }, { payment_status: "manual_unpaid" },
    { stripe_checkout_session_id: "cs_test_example123" }, { stripe_checkout_session_id: "manual_123" },
    { total_cents: 1 }, { total_cents: NaN }, { currency: "eur" }, { id: "private@example.com" },
    { refund_status: "succeeded" }, { stripe_refund_id: "re_123" }, { line_items_json: [] },
    { customer_details_json: null }, { shipping_amount_cents: -1 }
  ])("does not count an unverified or inconsistent order: %j", (change) => {
    expect(verifiedPurchase({ ...order(), ...change })).toBeNull();
  });
  it("includes the first recurring charge without projecting future subscription revenue", () => {
    const source = order();
    source.total_cents += 999;
    Object.assign(source.line_items_json[0].setup, { serviceMode: "HOSTED", monthlyPriceCents: 999 });
    const result = verifiedPurchase(source);
    expect(result?.value).toBe(48.99);
    expect(result?.items[1]).toEqual({ item_id: "multi-link-monthly", item_name: "Multi-Link Monthly Service", item_variant: "subscription", price: 9.99, quantity: 1 });
  });
  it("rejects malformed line quantities and line totals", () => {
    for (const change of [{ quantity: -1 }, { quantity: 1.5 }, { unitAmountCents: -5 }, { lineSubtotalCents: 12 }]) {
      const source = order();
      Object.assign(source.line_items_json[0], change);
      expect(verifiedPurchase(source)).toBeNull();
    }
  });
});

describe("browser analytics consent and dispatch", () => {
  const config = { measurementId: "G-EXAMPLE123", origin: "https://taprater.com" };
  let storage: Map<string, string>;
  let scripts: Array<{ onload?: () => void; src?: string }>;
  let target: { location: { origin: string; pathname: string; hostname: string; href: string }; tapRaterDataLayer?: IArguments[] };
  let client: typeof import("@/lib/analytics-browser");
  const commands = () => (target.tapRaterDataLayer ?? []).map((args) => Array.from(args));
  const events = () => commands().filter((args) => args[0] === "event");
  beforeEach(async () => {
    vi.resetModules();
    storage = new Map();
    scripts = [];
    target = { location: { origin: config.origin, pathname: "/shop", hostname: "taprater.com", href: "https://taprater.com/shop?email=private@example.com#secret" } };
    vi.stubGlobal("window", target);
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", { cookie: "", createElement: () => ({}), head: { appendChild: (script: typeof scripts[number]) => scripts.push(script) } });
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    client = await import("@/lib/analytics-browser");
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  function grant() { client.saveBrowserConsent("granted"); client.syncAnalytics(config, () => {}); scripts[0]?.onload?.(); }

  it("records the landing page before a child product effect and does not duplicate its page view", () => {
    target.location.pathname = "/product/google-review-stand";
    grant();
    const stand = ecommerceData([{ item_id: "google-review-stand", item_variant: "branded_qr_direct", price: 49, quantity: 1 }]);
    client.trackEcommerce("view_item", stand);
    client.trackPageView();
    expect(events().map(([, name]) => name)).toEqual(["page_view", "view_item"]);
    target.location.pathname = "/cart";
    client.trackEcommerce("view_cart", stand);
    client.trackPageView();
    expect(events().map(([, name]) => name)).toEqual(["page_view", "view_item", "page_view", "view_cart"]);
  });

  it("carries a paid campaign through navigation and a return visit, then forgets it on rejection", async () => {
    const sessions = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => sessions.get(key) ?? null, setItem: (key: string, value: string) => sessions.set(key, value), removeItem: (key: string) => sessions.delete(key) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null)));
    Object.assign(target.location, { pathname: "/product/google-review-stand", search: "?utm_source=google&utm_medium=cpc&utm_campaign=google_stands&gclid=test-click-123&email=private@example.com" });
    client.captureAnalyticsEntry();
    expect(storage.has(campaignStorageKey)).toBe(false);
    grant();
    client.trackPageView();
    const firstSession = JSON.parse(sessions.get(analyticsSessionKey)!);
    Object.assign(target.location, { pathname: "/checkout", search: "" });
    client.trackCheckoutStep("payment_step");
    expect(events().at(-1)?.[2]).toMatchObject({ campaign_source: "google", campaign_medium: "cpc", campaign_name: "google_stands" });
    expect(JSON.stringify([...storage.values()])).not.toMatch(/test-click|private/);
    sessions.clear();
    vi.resetModules();
    client = await import("@/lib/analytics-browser");
    client.syncAnalytics(config);
    client.trackPageView();
    const returningSession = JSON.parse(sessions.get(analyticsSessionKey)!);
    expect(returningSession.id).not.toBe(firstSession.id);
    expect(returningSession.attribution).toEqual(firstSession.attribution);
    expect(events().at(-1)?.[2]).not.toHaveProperty("campaign_source");
    client.saveBrowserConsent("denied");
    expect(storage.has(campaignStorageKey)).toBe(false);
    expect(sessions.has(analyticsSessionKey)).toBe(false);
    expect(client.trackPageView()).toBe(false);
  });

  it("replaces an active direct session when the visitor arrives from a new campaign", () => {
    const sessions = new Map<string, string>();
    const oldId = crypto.randomUUID();
    sessions.set(analyticsSessionKey, JSON.stringify({ id: oldId, lastSeen: Date.now(), landing: "/", attribution: { source: "direct", medium: "none" } }));
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => sessions.get(key) ?? null, setItem: (key: string, value: string) => sessions.set(key, value) });
    Object.assign(target.location, { search: "?utm_source=google&utm_medium=cpc&utm_campaign=stands" });
    grant();
    const current = JSON.parse(sessions.get(analyticsSessionKey)!);
    expect(current.id).not.toBe(oldId);
    expect(current.attribution).toEqual({ source: "google", medium: "cpc", campaign: "stands" });
  });

  it("does not attribute a direct return to an expired campaign", () => {
    const sessions = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => sessions.get(key) ?? null, setItem: (key: string, value: string) => sessions.set(key, value) });
    storage.set(campaignStorageKey, JSON.stringify({ version: 1, source: "google", medium: "cpc", campaign: "old", savedAt: Date.now() - campaignMaxAge }));
    grant();
    expect(JSON.parse(sessions.get(analyticsSessionKey)!).attribution).toEqual({ source: "direct", medium: "none" });
  });

  it("waits for Google identity while its tag loads so the server purchase can join the campaign session", async () => {
    const sessions = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => sessions.get(key) ?? null, setItem: (key: string, value: string) => sessions.set(key, value) });
    Object.assign(target.location, { search: "?utm_source=google&utm_medium=cpc&utm_campaign=stands" });
    client.saveBrowserConsent("granted");
    client.syncAnalytics(config);
    const pending = client.checkoutAnalyticsHeaders();
    scripts[0].onload?.();
    for (const args of commands().filter(args => args[0] === "get")) {
      (args[3] as (value: string) => void)(args[2] === "client_id" ? "123.456" : "1791576000");
    }
    const identity = JSON.parse((await pending)["x-taprater-analytics"]);
    expect(identity).toMatchObject({ clientId: "123.456", gaSessionId: "1791576000", entry: { source: "google", medium: "cpc", campaign: "stands" } });
  });

  it("does not load Google or send events before consent, after rejection, or without configuration", () => {
    client.syncAnalytics(config, () => {});
    expect(client.trackPageView()).toBe(false);
    client.saveBrowserConsent("denied");
    client.syncAnalytics(config, () => {});
    expect(scripts).toHaveLength(0);
    expect(events()).toHaveLength(0);
    client.saveBrowserConsent("granted");
    client.syncAnalytics({ ...config, measurementId: null }, () => {});
    expect(scripts).toHaveLength(0);
  });
  it("loads once after consent, keeps ads denied and removes sensitive URL data", () => {
    grant();
    client.syncAnalytics(config, () => {});
    expect(scripts).toHaveLength(1);
    expect(client.trackPageView()).toBe(true);
    expect(events()[0][2]).toMatchObject({ page_location: "https://taprater.com/shop", page_referrer: "", page_title: "Tap Rater shop" });
    expect(JSON.stringify(commands())).not.toMatch(/private@|#secret/);
    expect(commands().find((args) => args[0] === "config")?.[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    for (const args of commands().filter((args) => args[0] === "consent")) expect(args[2]).toMatchObject({ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  });
  it("preserves only validated Google click IDs after a separate ad-measurement opt-in", async () => {
    const ads = await import("@/lib/google-ads-consent");
    Object.assign(target.location, { search: "?gclid=valid-click-123&gbraid=valid-braid-123&email=private@example.com&session_id=secret" });
    grant();
    client.trackPageView();
    expect(events().at(-1)?.[2].page_location).toBe("https://taprater.com/shop");
    ads.saveGoogleAdsConsent("granted");
    client.syncAnalytics(config);
    client.trackCheckoutStep("payment_step");
    expect(events().at(-1)?.[2].page_location).toBe("https://taprater.com/shop?gclid=valid-click-123&gbraid=valid-braid-123");
    expect(commands().filter(a => a[0] === "consent").at(-1)?.[2]).toMatchObject({ ad_storage: "granted", ad_user_data: "granted", ad_personalization: "denied" });
    expect(JSON.stringify(commands())).not.toMatch(/private@|session_id=secret/);
    expect(JSON.stringify([...storage.values()])).not.toContain("valid-click");
    ads.saveGoogleAdsConsent("denied");
    client.syncAnalytics(config);
    client.trackCheckoutStep("payment_step");
    expect(events().at(-1)?.[2].page_location).toBe("https://taprater.com/shop");
    expect(commands().filter(a => a[0] === "consent").at(-1)?.[2]).toMatchObject({ ad_storage: "denied", ad_user_data: "denied" });
  });
  it("does not expand legacy Meta consent or override GPC for Google Ads", async () => {
    const ads = await import("@/lib/google-ads-consent");
    storage.set("taprater:marketing-consent:v1", JSON.stringify({version: 1, choice: "granted", savedAt: Date.now()}));
    expect(ads.googleAdsConsent()).toBeNull();
    ads.saveGoogleAdsConsent("granted");
    vi.stubGlobal("navigator", {globalPrivacyControl: true});
    expect(ads.googleAdsConsent()).toBe("denied");
    grant();
    expect(scripts).toHaveLength(0);
  });
  it("scrubs queued click data when ad consent is withdrawn before Google loads", async () => {
    const ads = await import("@/lib/google-ads-consent");
    Object.assign(target.location, {search: "?gclid=valid-click-123"});
    client.saveBrowserConsent("granted");
    ads.saveGoogleAdsConsent("granted");
    client.syncAnalytics(config);
    client.trackPageView();
    expect(JSON.stringify(commands())).toContain("valid-click-123");
    ads.saveGoogleAdsConsent("denied");
    client.syncAnalytics(config);
    expect(JSON.stringify(commands())).not.toContain("valid-click-123");
    for (const args of commands().filter(a => a[0] === "consent")) expect(args[2]).toMatchObject({ad_storage: "denied", ad_user_data: "denied"});
  });
  it("fails closed on invalid click parameters and unavailable ad consent storage", async () => {
    const ads = await import("@/lib/google-ads-consent");
    expect(ads.googleClickQuery("?gclid=private@example.com&wbraid=valid-braid-123")).toBe("wbraid=valid-braid-123");
    vi.stubGlobal("localStorage", {getItem: () => null, setItem: () => {throw new Error("blocked");}});
    expect(ads.saveGoogleAdsConsent("granted")).toBe(false);
    expect(ads.googleAdsConsent()).toBe("denied");
  });

  it("lets GA classify direct visits without a synthetic campaign", () => {
    const sessions = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => sessions.get(key) ?? null, setItem: (key: string, value: string) => sessions.set(key, value) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null)));
    grant();
    client.trackPageView();
    expect(events()[0][2]).not.toHaveProperty("campaign_source");
    expect(events()[0][2]).not.toHaveProperty("campaign_medium");
  });
  it("keeps sanitized campaign attribution and catalog product names", () => {
    Object.assign(target.location, { search: "?utm_source=etsy&utm_medium=referral&utm_campaign=shop&email=private@example.com" });
    const sessions = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => sessions.get(key) ?? null, setItem: (key: string, value: string) => sessions.set(key, value) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null)));
    grant();
    client.trackEcommerce("view_item", {currency:"USD",value:39,items:[{item_id:"google-review-stand",item_name:"private@example.com",item_variant:"standard_direct",price:39,quantity:1}]});
    expect(events().find(([, name]) => name === "view_item")?.[2]).toMatchObject({campaign_source:"etsy",campaign_medium:"referral",campaign_name:"shop",items:[{item_name:analyticsItemName("google-review-stand")}]});
    expect(JSON.stringify(commands())).not.toContain("private@example.com");
  });
  it("records the consented stand journey and links checkout while the Google tag is unavailable", async () => {
    target.location.pathname = "/product/google-review-stand";
    const sessions = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => sessions.get(key) ?? null, setItem: (key: string, value: string) => sessions.set(key, value) });
    const post = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", post);
    client.saveBrowserConsent("granted");
    const onGoogleReady = vi.fn();
    expect(client.syncAnalytics(config, onGoogleReady)).toBe(true);
    const stand = ecommerceData([{ item_id: "google-review-stand", item_variant: "branded_qr_direct", price: 49, quantity: 1 }]);
    expect(client.trackPageView()).toBe(true);
    client.trackEcommerce("view_item", stand);
    client.trackEcommerce("stand_setup_started", stand);
    client.trackEcommerce("stand_design_approved", stand);
    client.trackEcommerce("add_to_cart", stand);
    target.location.pathname = "/checkout";
    client.trackEcommerce("begin_checkout", stand);
    client.trackCheckoutStep("add_shipping_info", stand);
    const headers = await client.checkoutAnalyticsHeaders();
    client.trackCheckoutStep("payment_step", stand);
    client.trackCheckoutStep("add_payment_info", stand);
    const recorded = post.mock.calls.map(([, request]) => JSON.parse(request.body));
    expect(recorded.map(event => event.name)).toEqual(["page_view", "view_item", "stand_setup_started", "stand_design_approved", "add_to_cart", "page_view", "begin_checkout", "add_shipping_info", "payment_step", "add_payment_info"]);
    expect(recorded.at(-1)).toMatchObject({ itemId: "google-review-stand", page: "/checkout", landing: "/product/google-review-stand" });
    expect(new Set(recorded.map(event => event.sessionId))).toEqual(new Set([JSON.parse(headers["x-taprater-analytics"]).sessionId]));
    expect(events().find(([, name]) => name === "add_payment_info")?.[2]).toMatchObject({ items: [{ item_id: "google-review-stand" }], value: 49, currency: "USD" });
    expect(onGoogleReady).not.toHaveBeenCalled();
    expect(await client.trackPurchase(verifiedPurchase(order())!)).toBe(false);
    scripts[0].onload?.();
    expect(onGoogleReady).toHaveBeenCalledOnce();
    expect(await client.trackPurchase(verifiedPurchase(order())!)).toBe(true);
  });
  it("discards events still waiting for Google when consent is withdrawn", () => {
    client.saveBrowserConsent("granted");
    client.syncAnalytics(config);
    client.trackPageView();
    expect(events()).toHaveLength(1);
    client.saveBrowserConsent("denied");
    client.syncAnalytics(config);
    expect(events()).toHaveLength(0);
    expect(client.trackPageView()).toBe(false);
  });
  it("blocks private pages even before a navigation effect has run", () => {
    grant();
    target.location.pathname = "/account/orders";
    expect(client.trackPageView()).toBe(false);
    expect(client.trackEcommerce("view_cart", ecommerceData([]))).toBe(false);
    client.syncAnalytics(config, () => {});
    expect((target as unknown as Record<string, unknown>)["ga-disable-G-EXAMPLE123"]).toBe(true);
    expect(events()).toHaveLength(0);
  });
  it("does not send production analytics from localhost", () => {
    target.location.origin = "http://127.0.0.1:3031";
    grant();
    expect(scripts).toHaveLength(0);
    expect(client.trackPageView()).toBe(false);
  });
  it("respects GPC even with stored consent", () => {
    vi.stubGlobal("navigator", { globalPrivacyControl: true });
    grant();
    expect(scripts).toHaveLength(0);
    expect(client.browserConsent()).toBe("denied");
  });
  it("revokes immediately and remains off if storing the rejection fails", () => {
    grant();
    vi.stubGlobal("localStorage", { getItem: () => storage.get(consentStorageKey), setItem: () => { throw new Error("blocked"); } });
    expect(client.saveBrowserConsent("denied")).toBe(false);
    client.syncAnalytics(config, () => {});
    expect(client.trackPageView()).toBe(false);
    expect((target as unknown as Record<string, unknown>)["ga-disable-G-EXAMPLE123"]).toBe(true);
  });
  it("does not reserve a purchase before consent; dispatches it only once after consent", async () => {
    const data = verifiedPurchase(order())!;
    expect(await client.trackPurchase(data)).toBe(false);
    grant();
    expect(await client.trackPurchase(data)).toBe(true);
    expect(await client.trackPurchase(data)).toBe(false);
    expect(events().filter((args) => args[1] === "purchase")).toHaveLength(1);
    expect(storage.get(`taprater:ga4-purchase:${config.measurementId}:${data.transaction_id}`)).toBe("sent");
  });
  it("deduplicates across reloads and fails closed when persistent deduplication is unavailable", async () => {
    grant();
    const data = verifiedPurchase(order())!;
    storage.set(`taprater:ga4-purchase:${config.measurementId}:${data.transaction_id}`, "sent");
    expect(await client.trackPurchase(data)).toBe(false);
    storage.clear();
    client.saveBrowserConsent("granted");
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: () => { throw new Error("blocked"); } });
    expect(await client.trackPurchase(data)).toBe(false);
    expect(events()).toHaveLength(0);
  });
});
