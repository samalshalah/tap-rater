import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { Footer } from "@/components/layout/footer";
import CustomStandsPage from "@/app/custom-stands/page";
import MultiLinkPage from "@/app/multi-link/page";

vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));
vi.mock("@/lib/db", () => ({
  hasSupabaseAdminConfig: () => false,
  getSupabaseAdmin: () => { throw new Error("Database access is forbidden in copy tests."); }
}));
vi.mock("@/lib/product-repository", () => ({
  getStorefrontProducts: async () => [], staticStorefrontProducts: () => []
}));

describe("public capability copy", () => {
  it("keeps every active catalog Standard option NFC-only", () => {
    for (const product of migratedProducts.filter((product) => product.isActive)) {
      const standard = getProductPurchaseOptions(product).find((option) => option.id === "standard_direct");
      if (standard) expect(standard.hasQr, product.slug).toBe(false);
      expect(product.shortDescription, product.slug).not.toMatch(/NFC and QR|tap or scan/i);
    }
    const google = migratedProducts.find((product) => product.slug === "google-review-stand")!;
    expect(google.description).toContain("Standard uses NFC only, with no printed QR.");
    expect(google.description).toContain("Approve the Branded artwork preview before payment.");
    expect(google.description).toContain("Final print artwork is generated after payment.");
  });

  it("renders the footer fallback with an explicit physical-design distinction", () => {
    const html = renderToStaticMarkup(createElement(Footer));
    expect(html).toContain("Standard is NFC-only; Branded adds printed QR");
  });

  it("keeps Standard NFC-only when describing the hosted Multi-Link add-on", async () => {
    const html = renderToStaticMarkup(await MultiLinkPage());
    expect(html).toContain("Standard remains NFC-only, with no printed QR.");
    expect(html).toContain("Branded adds a QR code pointing to the same page.");
    expect(html).toContain("$9.99/month");
    expect(html).not.toContain("QR and NFC point to one permanent");
  });

  it("renders the branded preview and payment sequence on the custom-stands page", async () => {
    const html = renderToStaticMarkup(await CustomStandsPage());
    expect(html).toContain("Approve the artwork preview before payment.");
    expect(html).toContain("Final print artwork is generated after payment.");
    expect(html).toContain("Branded QR is generated from the destination used by NFC.");
  });
});
