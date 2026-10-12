import { analyticsPage, readConsent, type ConsentChoice, type EcommerceData, type EcommerceEvent, type PurchaseData } from "@/lib/storefront-analytics";
import { internalAnalyticsCookie } from "@/lib/analytics-attribution";

export const marketingConsentKey = "taprater:marketing-consent:v1";
export const metaPixelId = "939157691154529";
let frame: HTMLIFrameElement | null = null;
let ready = false;
let activeConfig: { internal?: boolean; metaPixelId?: string | null; metaCatalogIds?: Record<string, string> } = {};
let readyCallback: (() => void) | null = null;
let listener: ((event: MessageEvent) => void) | null = null;

export function marketingConsent(): ConsentChoice | null {
  try {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || document.cookie.split(";").some(v => v.trim() === `${internalAnalyticsCookie}=1`)) return "denied";
    return readConsent(localStorage.getItem(marketingConsentKey));
  } catch { return null; }
}
export function saveMarketingConsent(choice: ConsentChoice) {
  try { localStorage.setItem(marketingConsentKey, JSON.stringify({ version: 1, choice, savedAt: Date.now() })); }
  catch { stopMetaPixel(); return false; }
  if (choice === "denied") stopMetaPixel();
  return true;
}
export function stopMetaPixel() {
  frame?.remove(); frame = null; ready = false;
  if (listener) window.removeEventListener("message", listener);
  listener = null;
  for (const name of ["_fbp", "_fbc"]) for (const domain of ["", window.location.hostname, ".taprater.com"])
    document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}; SameSite=Lax`;
}
export function syncMetaPixel(config: typeof activeConfig, onReady: () => void) {
  activeConfig = config; readyCallback = onReady;
  const page = analyticsPage(window.location.pathname);
  if (config.internal || config.metaPixelId !== metaPixelId || window.location.origin !== "https://taprater.com" || marketingConsent() !== "granted" || !page) { stopMetaPixel(); return; }
  if (frame) { if (ready) onReady(); return; }
  // Isolate the vendor script from checkout forms and raw session/recovery URLs.
  // The frame URL and referrer contain no order token, customer data or queries.
  frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = "Optional Meta marketing measurement";
  frame.referrerPolicy = "no-referrer";
  frame.src = "/meta-pixel";
  listener = event => {
    if (event.origin === window.location.origin && event.source === frame?.contentWindow && event.data === "taprater:meta-ready" && marketingConsent() === "granted") { ready = true; readyCallback?.(); }
  };
  window.addEventListener("message", listener);
  document.body.appendChild(frame);
}
function send(name: string, data: Record<string, unknown>, eventId?: string) {
  const page = analyticsPage(window.location.pathname);
  if (!ready || !frame?.contentWindow || activeConfig.internal || marketingConsent() !== "granted" || !page) return false;
  frame.contentWindow.postMessage({ type: "taprater:meta-event", name, data: { ...data, page_path: page.path }, eventId }, window.location.origin);
  return true;
}
export const trackMetaPage = () => send("PageView", {});
export function metaEventData(data: EcommerceData, ids: Record<string, string>) {
  const contents = data.items.flatMap(item => {
    const id = ids[`${item.item_id}:${item.item_variant}`];
    return id && Number.isFinite(item.price) && item.price >= 0 && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99
      ? [{ id, quantity: item.quantity, item_price: item.price }] : [];
  });
  return { content_type: "product", content_ids: contents.map(item => item.id), contents, currency: "USD", value: Math.round(contents.reduce((sum, item) => sum + item.item_price * item.quantity, 0) * 100) / 100, num_items: contents.reduce((sum, item) => sum + item.quantity, 0) };
}
export function trackMetaEcommerce(name: EcommerceEvent, data: EcommerceData) {
  const event = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", view_cart: "", remove_from_cart: "" }[name];
  const payload = metaEventData(data, activeConfig.metaCatalogIds ?? {});
  return Boolean(event && payload.contents.length && send(event, payload));
}
export function trackMetaPurchase(data: PurchaseData) {
  if (!/^[a-f0-9-]{36}$/i.test(data.transaction_id)) return false;
  const payload = metaEventData(data, activeConfig.metaCatalogIds ?? {});
  if (!payload.contents.length || !ready || marketingConsent() !== "granted") return false;
  const key = `taprater:meta-purchase:${data.transaction_id}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "sent");
    return send("Purchase", payload, data.transaction_id);
  } catch { return false; }
}
