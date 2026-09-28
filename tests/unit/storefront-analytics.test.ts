import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsPage, analyticsReferrer, cartAnalyticsItems, consentMaxAge, consentStorageKey, ecommerceData, getAnalyticsConfig, readConsent } from "@/lib/storefront-analytics";
import { verifiedPurchase } from "@/lib/analytics-purchase";

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
  it("groups category paths and admits public product pages", () => {
    expect(analyticsPage("/category/reviews")?.path).toBe("/category");
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
    expect(items).toEqual([{ item_id: "google-review-stand", item_variant: "standard_direct", price: 39, quantity: 2 }]);
    expect(ecommerceData(items).value).toBe(78);
  });
});

describe("verified purchase payload", () => {
  it("uses persisted amounts, excludes tax/shipping from value and excludes customer details", () => {
    const result = verifiedPurchase(order());
    expect(result).toEqual({ transaction_id: order().id, currency: "USD", value: 39, tax: 2.34, shipping: 12,
      items: [{ item_id: "google-review-stand", item_variant: "standard_direct", price: 39, quantity: 1 }] });
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
    expect(result?.items[1]).toEqual({ item_id: "multi-link-monthly", item_variant: "subscription", price: 9.99, quantity: 1 });
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
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    client = await import("@/lib/analytics-browser");
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  function grant() { client.saveBrowserConsent("granted"); client.syncAnalytics(config, () => {}); scripts[0]?.onload?.(); }

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
