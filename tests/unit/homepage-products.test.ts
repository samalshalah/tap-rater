import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { selectMobileHomepageProducts } from "@/lib/homepage-products";

const product = (slug: string) => ({ ...migratedProducts[0], slug });

describe("mobile homepage products", () => {
  it("limits the selection to six and represents categories before repeating them", () => {
    const groups = [
      [product("review-1"), product("review-2"), product("review-3")],
      [product("social-1"), product("social-2"), product("social-3")],
      [product("menu-1")],
      [product("links-1"), product("links-2")]
    ];

    expect(selectMobileHomepageProducts(groups).map((item) => item.slug)).toEqual([
      "review-1", "social-1", "menu-1", "links-1", "review-2", "social-2"
    ]);
    expect(groups[0].map((item) => item.slug)).toEqual(["review-1", "review-2", "review-3"]);
  });

  it("does not duplicate products that appear in multiple groups", () => {
    expect(selectMobileHomepageProducts([[product("one"), product("two")], [product("one"), product("three")]]).map((item) => item.slug))
      .toEqual(["one", "two", "three"]);
  });

  it("handles empty and short catalogs without filler products", () => {
    expect(selectMobileHomepageProducts([])).toEqual([]);
    expect(selectMobileHomepageProducts([[], [product("one")], []]).map((item) => item.slug)).toEqual(["one"]);
  });
});
