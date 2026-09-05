import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";

const mocks = vi.hoisted(() => ({ configured: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/db", () => ({ hasSupabaseAdminConfig: mocks.configured, getSupabaseAdmin: mocks.client }));
vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));
import { getCheckoutProducts, getStorefrontProductBySlug, getStorefrontProducts } from "@/lib/product-repository";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { validateCheckoutCart } from "@/lib/checkout";

let db: PaymentMemoryDb;
beforeEach(() => {
  db = new PaymentMemoryDb({ products: [{ slug: "google-review-stand", title: "Google Review Stand", status: "active", is_active: true, stock_status: "instock" }],
    product_options: [{ product_slug: "google-review-stand", option_code: "standard_direct", title: "Standard Direct", price_cents: 4200,
      is_active: true, requires_destination_url: true, has_qr: false, sort_order: 1 }] });
  mocks.configured.mockReturnValue(true);
  mocks.client.mockReturnValue(db);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("authoritative store catalog", () => {
  it("uses current admin option prices for the product page and server checkout", async () => {
    const first = await getStorefrontProductBySlug("google-review-stand");
    expect(getProductPurchaseOptions(first!)[0].priceCents).toBe(4200);
    db.table("product_options")[0].price_cents = 4600;
    const updated = await getStorefrontProductBySlug("google-review-stand");
    expect(getProductPurchaseOptions(updated!)[0].priceCents).toBe(4600);
    const cart = validateCheckoutCart([{ productId: "google-review-stand", optionId: "standard_direct", quantity: 2,
      setup: { destinationUrl: "https://example.com/review", priceCents: 1 } }], await getCheckoutProducts());
    expect(cart).toMatchObject({ ok: true, totalCents: 9200 });
  });

  it("honors inventory and option disable changes on the next request", async () => {
    expect(await getStorefrontProductBySlug("google-review-stand")).toBeDefined();
    db.table("products")[0].stock_status = "outofstock";
    expect(await getStorefrontProductBySlug("google-review-stand")).toBeUndefined();
    expect(await getCheckoutProducts()).toEqual([]);
    db.table("products")[0].stock_status = "instock";
    db.table("product_options")[0].is_active = false;
    expect(await getStorefrontProductBySlug("google-review-stand")).toBeUndefined();
    expect(await getCheckoutProducts()).toEqual([]);
  });

  it.each(["products", "product_options"])("does not substitute static prices after a %s read failure", async table => {
    db.failures.push({ table, action: "select", message: "offline" });
    expect(await getStorefrontProducts()).toEqual([]);
    db.failures.push({ table, action: "select", message: "offline" });
    expect(await getStorefrontProductBySlug("google-review-stand")).toBeUndefined();
    db.failures.push({ table, action: "select", message: "offline" });
    await expect(getCheckoutProducts()).rejects.toThrow("offline");
  });

  it("requires database configuration for checkout even when a static catalog exists", async () => {
    mocks.configured.mockReturnValue(false);
    await expect(getCheckoutProducts()).rejects.toThrow("not configured");
  });
});
