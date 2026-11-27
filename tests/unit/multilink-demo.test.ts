import { describe, expect, it } from "vitest";
import { findMultiLinkDemo, multiLinkDemos, multiLinkDemoSnapshot, renderMultiLinkDemoHtml } from "@/lib/multilink-demo";
import { recommendedMultiLinks } from "@/lib/multilink-industries";

describe("Multi-Link demo pages", () => {
  it("falls back to the first sample for an unknown business type", () => {
    expect(findMultiLinkDemo("nope")).toBe(multiLinkDemos[0]);
    expect(findMultiLinkDemo("hotel-travel").businessName).toBe("The Shoreline Inn");
  });

  it("uses the recommended links for each business type, with every link turned off", () => {
    for (const demo of multiLinkDemos) {
      const snapshot = multiLinkDemoSnapshot(demo);
      expect(snapshot.buttons.map((button) => button.iconKey)).toEqual(recommendedMultiLinks(demo.id, "connect-with-us-stand").map((link) => link.type));
      expect(snapshot.buttons.every((button) => button.url === "#")).toBe(true);
    }
  });

  it("renders a page that says it is a sample and records nothing", () => {
    const html = renderMultiLinkDemoHtml(findMultiLinkDemo("beauty-salon-wellness"));
    expect(html).toContain("Willow Day Spa");
    expect(html).toContain("Book Again");
    expect(html).toContain("Sample page · links are turned off");
    expect(html).not.toContain("ping=");
    expect(html).not.toContain(`<img class="tr-pixel"`);
  });
});
