import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import HomePage from "@/app/page";
import { getHomepageThemeContent, defaultHomepageContent } from "@/lib/website-content";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

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
  vi.mocked(getPublicBusinessUses).mockResolvedValue([]);
});

describe("mobile homepage layout", () => {
  it("uses one compact action-first buying sequence across mobile and desktop", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('data-home-featured-products="true"');
    expect(html.indexOf('data-home-section="actions"')).toBeLessThan(html.indexOf('data-home-featured-products'));
    expect(html).toContain('View all stands');
    expect(html).not.toContain('hidden lg:block');
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

  it("loads the existing business-use images for the homepage cards", async () => {
    const uses = defaultHomepageContent.showcase.scenes.map((scene) => ({
      slug: scene.slug, title: scene.title, description: scene.body, sortOrder: 0, isActive: true, productSlugs: [],
      imageUrl: `/uploads/use-cases/${scene.slug}-configured.png`
    }));
    vi.mocked(getPublicBusinessUses).mockResolvedValue(uses);
    const html = renderToStaticMarkup(await HomePage());
    const businessSection = html.split('data-home-section="business"')[1].split('</section>')[0];
    for (const use of uses) {
      expect(businessSection).toContain(optimizedUploadSrc(use.imageUrl, 640));
      expect(businessSection).toContain(optimizedUploadSrc(use.imageUrl, 160));
    }
    expect(businessSection).not.toContain("Product example");
  });

  it("keeps a specifically configured scene override and its caption", async () => {
    const content = structuredClone(defaultHomepageContent);
    content.showcase.scenes[0].image = { src: "/uploads/scene-override.png", alt: "Custom scene", caption: "Illustration" };
    vi.mocked(getHomepageThemeContent).mockResolvedValue(content);
    vi.mocked(getPublicBusinessUses).mockResolvedValue([{
      slug: content.showcase.scenes[0].slug, title: "Restaurants", description: "", sortOrder: 0, isActive: true, productSlugs: [],
      imageUrl: "/uploads/category-image.png"
    }]);
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain(optimizedUploadSrc('/uploads/scene-override.png', 640));
    expect(html).toContain("Illustration");
    expect(html).not.toContain(optimizedUploadSrc('/uploads/category-image.png', 640));
  });

  it("respects section and item visibility settings and an empty catalog", async () => {
    const content = structuredClone(defaultHomepageContent);
    for (const section of [content.hero, content.actions, content.featuredUses, content.multilink, content.howItWorks, content.customBranding, content.finalCta]) {
      section.enabled = false;
    }
    content.faqs.items = [];
    content.showcase.featuredEnabled = false;
    content.showcase.qualityEnabled = false;
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
