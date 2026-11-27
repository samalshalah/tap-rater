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

describe("Multi-Link demo focus", () => {
  it("shows the reviews or social page for a business", async () => {
    const { findMultiLinkDemo, multiLinkDemoSnapshot, readMultiLinkDemoFocus } = await import("@/lib/multilink-demo");
    const legal = findMultiLinkDemo("legal");
    expect(legal.businessName).toBe("Hartwell & Lane Law");
    expect(multiLinkDemoSnapshot(legal, "reviews").buttons.map((button) => button.iconKey)).toContain("martindale");
    expect(multiLinkDemoSnapshot(legal, "social").buttons[0].iconKey).toBe("linkedin");
    expect(readMultiLinkDemoFocus("nope")).toBe("general");
  });
});

describe("20-link pages", () => {
  it("accepts up to 20 links and uses compact buttons above 10", async () => {
    const { validateHostedPageSnapshot } = await import("@/lib/hosted-pages/snapshots");
    const { renderHostedPageHtml } = await import("@/lib/hosted-pages/render-html");
    const base = { schemaVersion: 1 as const, code: "ZGBC6FKZH7T3", version: "v-1", publishedAt: "2026-11-27T00:00:00.000Z", lifecycleStatus: "ACTIVE" as const, businessName: "Test" };
    const button = (i: number) => ({ id: `b${i}`, label: `Link ${i}`, type: "website" as const, iconKey: "website" as const, url: `https://example.com/${i}` });
    const twenty = validateHostedPageSnapshot({ ...base, buttons: Array.from({ length: 20 }, (_, i) => button(i)) });
    expect(twenty.buttons).toHaveLength(20);
    expect(() => validateHostedPageSnapshot({ ...base, buttons: Array.from({ length: 21 }, (_, i) => button(i)) })).toThrow();
    expect(renderHostedPageHtml({ state: "available", snapshot: twenty })).toContain(`class="tr-buttons tr-buttons-many"`);
    const ten = validateHostedPageSnapshot({ ...base, buttons: Array.from({ length: 10 }, (_, i) => button(i)) });
    expect(renderHostedPageHtml({ state: "available", snapshot: ten })).toContain(`class="tr-buttons"`);
  });
});
