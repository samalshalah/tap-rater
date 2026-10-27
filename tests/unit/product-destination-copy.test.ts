import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { getProductDestinationCopy } from "@/lib/product-page-content";
const product = { ...migratedProducts[0], requiresLandingPage: false, serviceMode: "basic_redirect" as const, productKind: "normal_direct" as const };
describe("platform destination lookup", () => {
  it("returns fresh copies without leaking caller mutations", () => {
    const p = { ...product, primaryPlatformSlug: "google" };
    const first = getProductDestinationCopy(p);
    first.label = "changed";
    expect(getProductDestinationCopy(p).label).toBe("Google review");
  });
  it("preserves Facebook social and review variants", () => {
    expect(getProductDestinationCopy({ ...product, primaryPlatformSlug: " FACEBOOK ", destinationType: "social" }).label).toBe("Facebook");
    expect(getProductDestinationCopy({ ...product, primaryPlatformSlug: "facebook", destinationType: "review" }).label).toBe("Facebook review");
  });
  it.each(["__proto__", "constructor", "toString", "custom-url"])("uses destination fallback for %s", primaryPlatformSlug => {
    expect(getProductDestinationCopy({ ...product, primaryPlatformSlug, destinationType: "menu" }).label).toBe("menu");
  });
});
