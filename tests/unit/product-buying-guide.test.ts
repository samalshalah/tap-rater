import { describe, expect, it } from "vitest";
import { productBuyingGuides } from "@/data/product-buying-guides";
import { staticStorefrontProducts } from "@/lib/product-repository";
import { getProductBuyingFaqs, getProductBuyingGuide, resolveProductPageSeo } from "@/lib/product-buying-guide";

const products = staticStorefrontProducts();

describe("product buying guides", () => {
  it("covers every public catalog product with distinct substantive guidance", () => {
    expect(products.length).toBeGreaterThanOrEqual(58);
    for (const product of products) {
      const guide = getProductBuyingGuide(product);
      expect(guide, product.slug).toBeDefined();
      expect(Object.values(guide!).join(" ").split(/\s+/).length, product.slug).toBeGreaterThan(135);
      const faqs = getProductBuyingFaqs(product);
      expect(faqs.length, product.slug).toBeGreaterThanOrEqual(5);
      expect(new Set(faqs.map((faq) => faq.question.toLowerCase())).size).toBe(faqs.length);
    }
    for (const field of ["introduction", "placement", "destination", "question", "answer"] as const) {
      expect(new Set(products.map((product) => productBuyingGuides[product.slug][field])).size).toBe(products.length);
    }
  });

  it("provides distinct concise metadata for seeded catalog descriptions", () => {
    const descriptions = products.map((product) => resolveProductPageSeo(product).description);
    expect(new Set(descriptions).size).toBe(products.length);
    for (const description of descriptions) {
      expect(description.length).toBeLessThanOrEqual(158);
      expect(description.length).toBeGreaterThan(70);
    }
  });

  it("preserves merchant SEO and FAQs and supports products added later", () => {
    const product = { ...products[0], seoTitle: "My custom title", seoDescription: "My custom description", productFaqs: [{ question: "Do you support our reception?", answer: "Ask our local team." }] };
    expect(resolveProductPageSeo(product)).toMatchObject({ title: "My custom title", description: "My custom description" });
    expect(getProductBuyingFaqs(product)).toContainEqual(product.productFaqs[0]);
    const futureProduct = { ...product, slug: "new-product-stand" };
    expect(getProductBuyingGuide(futureProduct)).toBeUndefined();
    expect(resolveProductPageSeo(futureProduct).description).toBe(product.seoDescription);
    expect(getProductBuyingFaqs(futureProduct)).toContainEqual(product.productFaqs[0]);
    expect(getProductBuyingGuide({ ...product, slug: "linkedin-connect-stand" })?.introduction).toContain("LinkedIn Connect");
    const fiveFaqs = Array.from({ length: 5 }, (_, i) => ({ question: `Custom question ${i}`, answer: "Merchant answer" }));
    const merged = getProductBuyingFaqs({ ...product, productFaqs: fiveFaqs });
    expect(merged.length).toBeLessThanOrEqual(6);
    fiveFaqs.forEach((faq) => expect(merged).toContainEqual(faq));
  });

  it("keeps QR availability and platform-specific limitations explicit", () => {
    const standardOnly = { ...products[0], assetSet: {}, purchaseOptions: [] };
    const qrFaq = getProductBuyingFaqs(standardOnly).find((faq) => faq.question === "Which design includes a printed QR code?");
    expect(qrFaq?.answer).toContain("unavailable");
    expect(qrFaq?.answer).toContain("unavailable");
    expect(productBuyingGuides["yelp-review-stand"].answer).toContain("should not ask for reviews");
    expect(productBuyingGuides["airbnb-review-stand"].answer).toContain("eligible");
    expect(productBuyingGuides["caredash-review-stand"].destination).toContain("Do not assume");
  });
});
