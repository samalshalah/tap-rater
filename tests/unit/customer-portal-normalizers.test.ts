import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/products", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/products")>();
  return { ...actual, getProductBySlug: vi.fn(actual.getProductBySlug) };
});
import { getProductBySlug } from "@/lib/products";
import { buildCustomerStands, normalizeOrder } from "@/lib/customer-portal-normalizers";
beforeEach(() => vi.mocked(getProductBySlug).mockClear());
function order(quantity: number, productId = "google-review-stand") {
  return normalizeOrder({ id: "order-1", stripe_checkout_session_id: "session-1", status: "paid", payment_status: "paid", production_status: "not_started", shipping_status: "not_shipped", line_items_json: [{ productId, standLineId: "line-1", optionId: "standard_direct", title: "Review stand", sku: "TEST", quantity, unitAmountCents: 3900, lineSubtotalCents: 3900 * quantity, setup: { destinationUrl: "https://example.com" } }] })!;
}
describe("customer stand product-image lookup", () => {
  it("looks up the product once for a multi-unit order line", () => {
    const stands = buildCustomerStands([order(25)], []);
    expect(stands).toHaveLength(25);
    expect(getProductBySlug).toHaveBeenCalledTimes(1);
    expect(new Set(stands.map(s => s.id)).size).toBe(25);
    expect(stands.map(s => s.unitNumber)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(stands.every(s => s.quantity === 1 && s.productImageUrl === stands[0].productImageUrl && s.standLineId === "line-1")).toBe(true);
  });
  it("retains the unit cap and missing-product fallback", () => {
    const stands = buildCustomerStands([order(1500, "unknown-product")], []);
    expect(stands).toHaveLength(1000);
    expect(getProductBySlug).toHaveBeenCalledTimes(1);
    expect(stands.every(s => s.productImageUrl === undefined)).toBe(true);
  });
  it("does not share a cached image across separate loads", () => {
    buildCustomerStands([order(2)], []);
    buildCustomerStands([order(2)], []);
    expect(getProductBySlug).toHaveBeenCalledTimes(2);
  });
});
