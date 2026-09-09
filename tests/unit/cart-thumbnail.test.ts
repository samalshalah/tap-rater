import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartTable } from "@/components/cart/cart-table";
import { getDefaultTaxSettings } from "@/lib/tax-settings";

const { cart } = vi.hoisted(() => ({ cart: vi.fn() }));
vi.mock("@/components/cart/cart-provider", () => ({ useCart: cart }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  cart.mockReturnValue({ items: [{ productId: "google-review-stand", quantity: 2 }] });
});
const render = () => renderToStaticMarkup(createElement(CartTable, { taxSettings: getDefaultTaxSettings() }));

describe("cart thumbnail delivery", () => {
  it("renders a 160px variant with stable dimensions and preserves totals and controls", () => {
    const html = render();
    expect(html).toContain('src="/uploads-optimized/products/taprater-stands/google/google-standard-angled-w160.webp"');
    expect(html).not.toContain('src="/uploads/products/taprater-stands/google/google-standard-angled.png"');
    expect(html).toContain('width="96" height="96" decoding="async"');
    expect(html).toContain("Increase Google Review Stand quantity");
    expect(html).toContain("Remove Google Review Stand");
    expect(html).toContain("$78.00");
    expect(html).toContain("Secure checkout");
  });

  it.each(["https://cdn.example.com/proof.png", "/api/media/proof-123"])("preserves dynamic or external proof source %s", (src) => {
    cart.mockReturnValue({ items: [{
      productId: "new-database-stand", optionId: "standard_direct", quantity: 1,
      productSnapshot: { title: "New database stand", sku: "QA-STAND", shortDescription: "Test" },
      setup: { proofPreviewData: { previewImageUrl: src } }
    }] });
    expect(render()).toContain(`src="${src}"`);
  });

  it("optimizes the catalog fallback for a stand without a preview", () => {
    cart.mockReturnValue({ items: [{
      productId: "new-database-stand", optionId: "standard_direct", quantity: 1,
      productSnapshot: { title: "New database stand", sku: "QA-STAND", shortDescription: "Test" }
    }] });
    expect(render()).toContain('src="/uploads-optimized/products/rate-your-experience-stand-w160.webp"');
  });
});
