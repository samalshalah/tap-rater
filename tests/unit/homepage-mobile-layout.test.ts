import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import HomePage from "@/app/page";
import { getHomepageThemeContent, defaultHomepageContent } from "@/lib/website-content";
import { getStorefrontProducts } from "@/lib/product-repository";

vi.mock("@/lib/website-content", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/website-content")>(),
  getHomepageThemeContent: vi.fn()
}));
vi.mock("@/lib/product-repository", () => ({ getStorefrontProducts: vi.fn() }));
vi.mock("@/lib/admin-business-uses", () => ({ getPublicBusinessUses: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/purchase-options", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/purchase-options")>(),
  isHostedPurchaseOptionEnabled: () => true
}));

beforeEach(() => {
  vi.mocked(getHomepageThemeContent).mockResolvedValue(structuredClone(defaultHomepageContent));
  vi.mocked(getStorefrontProducts).mockResolvedValue(migratedProducts);
});

describe("mobile homepage layout", () => {
  it("offers a compact mobile product selection before the supporting browsing sections", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('data-home-mobile-products="true"');
    expect(html.indexOf('data-home-mobile-products')).toBeLessThan(html.indexOf('Start with the customer action.'));
    expect(html).toContain('View all stands');
    expect(html).toContain('hidden lg:block');
  });

  it("keeps configured text, images, and destinations instead of replacing admin content", async () => {
    const content = structuredClone(defaultHomepageContent);
    content.hero.headline = "Configured storefront title";
    content.hero.image = { src: "/uploads/products/configured-hero.png", alt: "Configured stand image" };
    content.actions.items = [{
      title: "Configured customer action", description: "Configured action detail", href: "/category/menu",
      image: { src: "/uploads/products/configured-action.png", alt: "Configured action stand" }, enabled: true, order: 1
    }];
    vi.mocked(getHomepageThemeContent).mockResolvedValue(content);

    const html = renderToStaticMarkup(await HomePage());
    for (const text of ["Configured storefront title", "Configured stand image", "Configured customer action", "Configured action detail", "Configured action stand"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('href="/category/menu"');
  });

  it("respects section and item visibility settings and an empty catalog", async () => {
    const content = structuredClone(defaultHomepageContent);
    for (const section of [content.hero, content.actions, content.featuredUses, content.multilink, content.howItWorks, content.customBranding, content.finalCta]) {
      section.enabled = false;
    }
    content.faqs.items = [];
    vi.mocked(getHomepageThemeContent).mockResolvedValue(content);
    vi.mocked(getStorefrontProducts).mockResolvedValue([]);

    const html = renderToStaticMarkup(await HomePage());
    expect(html).not.toContain('<section');
    expect(html).not.toContain('data-home-mobile-products');
  });

  it("does not display disabled action links", async () => {
    const content = structuredClone(defaultHomepageContent);
    content.actions.items = [{ ...content.actions.items[0], title: "Hidden action", enabled: false }];
    vi.mocked(getHomepageThemeContent).mockResolvedValue(content);
    expect(renderToStaticMarkup(await HomePage())).not.toContain('Hidden action');
  });
});
