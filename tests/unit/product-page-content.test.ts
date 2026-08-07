import { describe, expect, it } from "vitest";
import { getProductBySlug } from "@/lib/products";
import {
  getProductActivationCopy,
  getProductComparisonRows,
  getProductPageHighlights,
  getProductPageUseCases,
  getProductServiceBadges
} from "@/lib/product-page-content";

describe("product page content", () => {
  it("builds purchase highlights from the product", () => {
    const product = getProductBySlug("google-review-stand");

    expect(product).toBeDefined();
    expect(getProductPageHighlights(product!).map((highlight) => highlight.title)).toEqual([
      "Tap or scan ready",
      "Connects to one destination URL",
      "Countertop physical product",
      "Simple customer prompt"
    ]);
  });

  it("returns business use cases for local customer touchpoints", () => {
    const product = getProductBySlug("google-review-stand");

    expect(getProductPageUseCases(product!)).toHaveLength(4);
    expect(getProductPageUseCases(product!)[0].title).toBe("Restaurants and cafes");
  });

  it("marks the active product type in comparison rows", () => {
    const stand = getProductBySlug("google-review-stand");
    const custom = getProductBySlug("custom-direct-stand");

    expect(getProductComparisonRows(stand!).find((row) => row.label === "Stand")?.active).toBe(true);
    expect(getProductComparisonRows(custom!).find((row) => row.label === "Custom")?.active).toBe(true);
  });

  it("builds customer-facing service badges from product strategy metadata", () => {
    const stand = getProductBySlug("google-review-stand");
    const feedback = getProductBySlug("rate-your-experience-stand");

    expect(getProductServiceBadges(stand!)).toEqual(["No monthly fee required", "Free basic activation"]);
    expect(getProductServiceBadges(feedback!)).toEqual(["No monthly fee required", "Free basic activation"]);
  });

  it("explains physical redirect activation", () => {
    const stand = getProductBySlug("google-review-stand");
    const feedback = getProductBySlug("rate-your-experience-stand");

    expect(getProductActivationCopy(stand!).body).toContain("connects directly");
    expect(getProductActivationCopy(feedback!).body).toContain("connects directly");
    expect(getProductActivationCopy(feedback!).body).toContain("No monthly fee");
  });
});
