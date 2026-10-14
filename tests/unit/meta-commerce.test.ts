import { afterEach, describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { parseMetaCheckout, metaCatalog, quoteMetaCheckout } from "@/lib/meta-checkout";
import { buildMerchantFeed } from "@/lib/merchant-feed";
import { defaultOffers } from "@/lib/offers";
import { merchantProductId } from "@/lib/merchant-product-id";
import { metaEventData } from "@/lib/meta-pixel";

const product = migratedProducts.find(p => p.slug === "google-review-stand")!;
const standard = merchantProductId(product, "standard_direct");
const branded = merchantProductId(product, "branded_qr_direct");
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("Meta checkout and catalog matching", () => {
  it("quotes Meta's three-stand selection together instead of quoting only the active setup", () => {
    const entries = parseMetaCheckout("TR-YELP-STAND_tr-yelp-stand-std:2,TR-CHECK-INFORMATION-STAND-STD:1", migratedProducts);
    const quote = quoteMetaCheckout(entries, defaultOffers);
    expect(entries.map(e => [e.quantity, e.unitAmountCents])).toEqual([[2, 3900], [1, 3900]]);
    expect(quote.originalCents).toBe(11700);
    expect(quote.discountCents).toBe(1200);
    expect(quote.subtotalCents).toBe(10500);
    expect(quote.lineDiscounts).toEqual([800, 400]);
  });
  it("uses configured catalog prices and applies the same mixed-design and disabled-offer rules as checkout", () => {
    const entries = parseMetaCheckout(`${standard}:2,${branded}:1`, [product]);
    const quote = quoteMetaCheckout(entries, defaultOffers);
    expect(quote.originalCents).toBe(12700);
    expect(quote.subtotalCents).toBe(11400);
    expect(quoteMetaCheckout(entries, { ...defaultOffers, enabled: false }).subtotalCents).toBe(12700);
    const changed = entries.map(e => ({ ...e, unitAmountCents: e.unitAmountCents + 100 }));
    expect(quoteMetaCheckout(changed, { ...defaultOffers, enabled: false }).subtotalCents).toBe(13000);
  });
  it("preserves mixed design selections and aggregates repeated quantities using exported IDs", () => {
    const result = parseMetaCheckout(`${standard}:2,${branded}:1,${standard}:3`, [product]);
    expect(result.map(({optionId, quantity}) => [optionId, quantity])).toEqual([["standard_direct",5],["branded_qr_direct",1]]);
    const feed = buildMerchantFeed([product], defaultOffers);
    for (const entry of metaCatalog([product])) expect(feed).toContain(`<g:id>${entry.id}</g:id>`);
  });
  it("rejects malformed, excessive, unknown and retired selections without partially importing", () => {
    for (const value of [undefined, [], "", `${standard}:0`, `${standard}:-1`, `${standard}:1.5`, `${standard}:100`, `${standard}:99,${standard}:1`, `${standard}:1,unknown:1`, `${standard}:1,`, `${standard}:1:2`]) expect(() => parseMetaCheckout(value, [product])).toThrow();
    expect(() => parseMetaCheckout(`${standard}:1`, [{ ...product, status: "draft" }])).toThrow();
  });
  it("advertising payload uses catalog IDs, discounted amounts and no customer setup data", () => {
    const payload = metaEventData({currency:"USD",value:9999,items:[{item_id:product.slug,item_variant:"standard_direct",price:33.15,quantity:2, email:"private@example.com"} as never,{item_id:"retired",item_variant:"standard_direct",price:1,quantity:1}]}, {[`${product.slug}:standard_direct`]:standard});
    expect(payload.content_ids).toEqual([standard]);
    expect(payload.value).toBe(66.3);
    expect(JSON.stringify(payload)).not.toMatch(/private|email|retired/);
  });
});

describe("Meta consent and private-page exclusions", () => {
  it("loads no vendor frame for analytics-only consent, internal users, GPC or admin pages; revocation removes it", async () => {
    const saved = new Map<string,string>();
    const append = vi.fn(); const remove = vi.fn(); const postMessage = vi.fn();
    const fakeFrame = { remove, contentWindow: { postMessage } };
    const location = { origin:"https://taprater.com", pathname:"/product/google-review-stand" };
    vi.stubGlobal("window", { location, addEventListener:vi.fn(),removeEventListener:vi.fn() });
    vi.stubGlobal("document", { cookie:"", body:{appendChild:append},createElement:()=>fakeFrame });
    vi.stubGlobal("navigator", {globalPrivacyControl:false});
    vi.stubGlobal("localStorage", {getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v)});
    const pixel = await import("@/lib/meta-pixel");
    const config = {metaPixelId:pixel.metaPixelId};
    pixel.syncMetaPixel(config,vi.fn()); expect(append).not.toHaveBeenCalled();
    pixel.saveMarketingConsent("granted");
    pixel.syncMetaPixel({...config,internal:true},vi.fn()); expect(append).not.toHaveBeenCalled();
    location.pathname="/admin/orders";
    pixel.syncMetaPixel(config,vi.fn()); expect(append).not.toHaveBeenCalled();
    location.pathname="/product/google-review-stand";
    vi.stubGlobal("navigator",{globalPrivacyControl:true});
    pixel.syncMetaPixel(config,vi.fn()); expect(append).not.toHaveBeenCalled();
    vi.stubGlobal("navigator",{});
    pixel.syncMetaPixel(config,vi.fn()); expect(append).toHaveBeenCalledOnce();
    pixel.saveMarketingConsent("denied"); expect(remove).toHaveBeenCalledOnce();
    expect(pixel.trackMetaPage()).toBe(false);
  });
});
