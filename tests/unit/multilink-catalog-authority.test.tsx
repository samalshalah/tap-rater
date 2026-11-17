import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";

vi.mock("@/lib/product-repository", () => ({
  getStorefrontProducts: async () => [],
  staticStorefrontProducts: () => migratedProducts.filter((product) => product.supportsMultiLink),
}));
import MultiLinkPage from "@/app/multi-link/page";

describe("Multi-Link catalog authority", () => {
  it("does not resurrect static products when the current catalog has no compatible inventory", async () => {
    const html = renderToStaticMarkup(await MultiLinkPage());
    expect(html).toContain("No compatible stands are available right now.");
    expect(html).not.toContain('href="/product/');
  });
});
