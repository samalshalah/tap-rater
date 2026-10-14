import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { catalogCategories } from "@/data/migrated-products";
import { categoryBuyingGuides } from "@/data/category-buying-guides";
import { CategoryBuyingGuide } from "@/components/storefront/category-buying-guide";
import { staticStorefrontProducts } from "@/lib/product-repository";

describe("category buying guidance", () => {
  it("covers every category with distinct guidance and five distinct FAQs", () => {
    const guides = catalogCategories.map(category => categoryBuyingGuides[category.slug]);
    expect(guides.every(Boolean)).toBe(true);
    expect(new Set(guides.map(guide => guide.introduction)).size).toBe(guides.length);
    for (const guide of guides) {
      expect(guide.faqs).toHaveLength(5);
      expect(new Set(guide.faqs.map(faq => faq.question)).size).toBe(5);
      for (const option of guide.options) {
        expect(staticStorefrontProducts().some(product => product.slug === option.slug), option.slug).toBe(true);
      }
    }
  });

  it("renders crawlable guidance and matching FAQ schema without adding another H1", () => {
    const html = renderToStaticMarkup(createElement(CategoryBuyingGuide, { slug: "reviews", products: staticStorefrontProducts() }));
    expect(html).not.toContain("<h1");
    expect(html.match(/<h2\b/g)).toHaveLength(3);
    expect(html.match(/<summary\b/g)).toHaveLength(5);
    const schema = JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/)![1]);
    expect(schema.mainEntity.map((item: { name: string }) => item.name)).toEqual(categoryBuyingGuides.reviews.faqs.map(faq => faq.question));
    expect(html).toContain('href="/product/google-review-stand"');
  });

  it("does not recommend unavailable products or render empty option cards", () => {
    const html = renderToStaticMarkup(createElement(CategoryBuyingGuide, { slug: "reviews", products: [] }));
    expect(html).not.toContain('href="/product/');
    expect(html).not.toContain("<article");
    expect(html).toContain("Prepare the right review destination");
  });
});
