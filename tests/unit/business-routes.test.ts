import { describe, expect, it } from "vitest";
import { businessPath, toBusinessHref } from "@/lib/business-routes";

describe("business page links", () => {
  it("builds /business links", () => {
    expect(businessPath("restaurant-food")).toBe("/business/restaurant-food");
  });

  it("moves saved /solutions links to /business and leaves other links alone", () => {
    expect(toBusinessHref("/solutions")).toBe("/business");
    expect(toBusinessHref("/solutions/automotive")).toBe("/business/automotive");
    expect(toBusinessHref("/solutions#businesses")).toBe("/business#businesses");
    expect(toBusinessHref("/solutions-guide")).toBe("/solutions-guide");
    expect(toBusinessHref("/shop")).toBe("/shop");
  });
});
