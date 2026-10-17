import { describe, expect, it, vi } from "vitest";
import { businessUseGuideSchema, defaultBusinessUseGuide, orderBusinessUseProducts, resolveRecommendations } from "@/lib/business-use-guide";
import { staticStorefrontProducts } from "@/lib/product-repository";
import { saveBusinessUseContent } from "@/lib/admin-business-uses";
import { businessUseContentSchema } from "@/lib/validators";
import { lockedBusinessUses } from "@/lib/catalog-architecture";

describe("business buying guides", () => {
  it.each(lockedBusinessUses.map((business) => business.slug))("provides a complete validated guide with public products for %s", (slug) => {
    const guide = defaultBusinessUseGuide(slug);
    expect(businessUseGuideSchema.safeParse(guide).success).toBe(true);
    expect(resolveRecommendations(guide, staticStorefrontProducts())).toHaveLength(3);
    expect(guide.placements).toHaveLength(3);
    const publicSlugs = new Set(staticStorefrontProducts().map((product) => product.slug));
    for (const placement of guide.placements ?? []) {
      expect(publicSlugs.has(placement.productSlug ?? "")).toBe(true);
    }
    expect(guide.steps).toHaveLength(3);
    expect(guide.faqs).toHaveLength(5);
    expect(guide.seoTitle).toBeTruthy();
    expect(guide.seoDescription).toBeTruthy();
  });
  it("gives each industry distinct headings, metadata, and editorial sections", () => {
    const guides = lockedBusinessUses.map((business) => defaultBusinessUseGuide(business.slug));
    for (const field of ["headline", "introduction", "seoTitle", "seoDescription", "recommendationsTitle", "placementTitle", "howItWorksTitle", "faqTitle"] as const) {
      expect(new Set(guides.map((guide) => guide[field])).size).toBe(guides.length);
    }
    const bodies = guides.flatMap((guide) => [...(guide.placements ?? []), ...(guide.steps ?? [])].map((item) => item.body));
    expect(new Set(bodies).size).toBe(bodies.length);
  });
  it("resolves every restaurant recommendation to a public catalog product", () => {
    const guide = defaultBusinessUseGuide("restaurant-food");
    expect(businessUseGuideSchema.safeParse(guide).success).toBe(true);
    expect(resolveRecommendations(guide, staticStorefrontProducts())).toHaveLength(3);
  });
  it("omits unpublished recommendations and honors an explicitly empty guide", () => {
    expect(resolveRecommendations(defaultBusinessUseGuide("restaurant-food"), [])).toEqual([]);
    expect(businessUseGuideSchema.parse({ recommendations: [], faqs: [] }).recommendations).toEqual([]);
  });
  it("rejects duplicate recommendations, incomplete copy, and more than three choices", () => {
    const guide = defaultBusinessUseGuide("restaurant-food");
    expect(businessUseGuideSchema.safeParse({ ...guide, recommendations: [guide.recommendations[0], guide.recommendations[0]] }).success).toBe(false);
    expect(businessUseGuideSchema.safeParse({ ...guide, recommendations: [{ ...guide.recommendations[0], reason: "" }] }).success).toBe(false);
    expect(businessUseGuideSchema.safeParse({ ...guide, recommendations: [...guide.recommendations, guide.recommendations[0]] }).success).toBe(false);
  });
  it("preserves admin order ahead of product-side assignments without duplicates", () => {
    const products = staticStorefrontProducts();
    const sorted = orderBusinessUseProducts(products, "restaurant-food", ["instagram-follow-stand", "google-review-stand"]);
    expect(sorted.slice(0, 2).map((product) => product.slug)).toEqual(["instagram-follow-stand", "google-review-stand"]);
    expect(new Set(sorted.map((product) => product.slug)).size).toBe(sorted.length);
  });
  it("persists guide content under the correct business key and reports save failures", async () => {
    const contentUpsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: (table: string) => table === "site_content" ? { upsert: contentUpsert } : {
      upsert: async () => ({ error: null }), delete: () => ({ eq: async () => ({ error: null }) }), insert: async () => ({ error: null })
    } };
    const input = businessUseContentSchema.parse({ slug: "restaurant-food", title: "Restaurants", guide: defaultBusinessUseGuide("restaurant-food") });
    await saveBusinessUseContent(client, input);
    expect(contentUpsert).toHaveBeenCalledWith(expect.objectContaining({ key: "business-guide.restaurant-food", payload: input.guide }), { onConflict: "key" });
    contentUpsert.mockResolvedValue({ error: { message: "Save failed" } });
    await expect(saveBusinessUseContent(client, input)).rejects.toThrow("Save failed");
  });
});
