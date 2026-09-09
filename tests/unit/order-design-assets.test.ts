import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOrderDesignText, getAdminOrderDesignAssetUrl, getOrderLogoStorageKey } from "@/lib/order-design-assets";
import type { OrderLineItem } from "@/lib/orders";

const original = "products/customer-setup-google-review-stand/center_asset/original.png";
const prepared = "products/customer-setup-google-review-stand/center_asset/trimmed.png";
const item: OrderLineItem = { productId: "google-review-stand", optionId: "branded_qr_direct", title: "Google Review Stand", sku: "GRS-BR", quantity: 2,
  unitAmountCents: 4900, lineSubtotalCents: 9800, proofApproved: true,
  setup: { businessName: "Business & Sons", originalLogoStorageKey: original, logoStorageKey: prepared, fontSizePercent: 115, logoSizePercent: 135,
    destinationUrl: "https://example.com/review", showBusinessNameOnProof: true, designNotes: "Keep the ampersand.\nSecond line." } };

afterEach(() => vi.unstubAllEnvs());
describe("order design assets", () => {
  it("keeps the original upload distinct from the processed print logo", () => {
    expect(getOrderLogoStorageKey(item)).toBe(original);
    expect(getOrderLogoStorageKey(item, false)).toBe(prepared);
  });
  it("falls back to the stored print logo for older orders without original metadata", () => {
    expect(getOrderLogoStorageKey({ ...item, setup: { logoStorageKey: prepared } })).toBe(prepared);
    expect(getOrderLogoStorageKey({ ...item, setup: {}, logoReference: prepared })).toBe(prepared);
  });
  it("supports stored same-origin media URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://taprater.com");
    expect(getOrderLogoStorageKey({ ...item, setup: { logoMediaUrl: `/api/media/product/${prepared}` } })).toBe(prepared);
    expect(getOrderLogoStorageKey({ ...item, setup: { originalLogoMediaUrl: `https://taprater.com/api/media/product/${original}`, logoStorageKey: prepared } })).toBe(original);
  });
  it.each([
    "products/customer-setup-other/center_asset/original.png", "products/../private.png", "products/customer-setup-google-review-stand/center_asset/logo.svg",
    "products/google-review-stand/production_artwork/cs-other/line-1-abcdef.svg", "https://other.example/api/media/product/" + original,
    "/api/media/product/" + original + "?key=elsewhere", "products/customer-setup-google-review-stand/center_asset/nested/logo.png"
  ])("rejects unsafe or unrelated logo references: %s", (key) => {
    expect(getOrderLogoStorageKey({ ...item, setup: { originalLogoStorageKey: key } })).toBeUndefined();
  });
  it("creates order-bound URLs and rejects invalid indexes", () => {
    expect(getAdminOrderDesignAssetUrl({ id: "order-1" }, 0, "text")).toBe("/api/admin/orders/order-1/assets/0?asset=text");
    expect(getAdminOrderDesignAssetUrl({}, 0, "text")).toBeUndefined();
    expect(getAdminOrderDesignAssetUrl({ id: "id" }, -1, "text")).toBeUndefined();
  });
  it("exports the exact business text, notes, destination, quantity, and design controls", () => {
    const text = buildOrderDesignText({ id: "order-1" }, item, 0);
    for (const expected of ["Business name: Business & Sons", "Business name printed: Yes", "Quantity: 2", "Business name size: 115%", "Logo size: 135%", "https://example.com/review", "Keep the ampersand.\nSecond line."]) expect(text).toContain(expected);
    expect(text).not.toContain(original);
  });
  it("retains Unicode text and reports hidden names and standard NFC-only orders correctly", () => {
    const hidden = { ...item, optionId: "standard_direct", setup: { businessName: "Caf\u00e9", showBusinessNameOnProof: false } };
    const text = buildOrderDesignText({ id: "order-1" }, hidden, 0);
    expect(text).toContain("Caf\u00e9"); expect(text).toContain("Business name printed: No"); expect(text).toContain("QR destination: No printed QR");
  });
});
