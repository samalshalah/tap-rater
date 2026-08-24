import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Tap Rater product strategy", () => {
  it("documents Tap Rater as a physical stand store first with platform features later", () => {
    const doc = readFileSync("docs/product-strategy.md", "utf8");

    expect(doc).toContain("physical NFC/QR tabletop stand store first");
    expect(doc).toContain("public launch storefront should sell only products Tap Rater can fulfill now");
    expect(doc).toContain("Standard Direct Stand");
    expect(doc).toContain("Branded + QR Direct Stand");
    expect(doc).toContain("Custom Direct Stand");
    expect(doc).toContain("managed setup");
    expect(doc).toContain("hosted landing pages");
    expect(doc).toContain("public subscription checkout");
    expect(doc).toContain("Do not block unhappy customers");
    expect(doc).toContain("Phase 1");
    expect(doc).toContain("Phase 2");
    expect(doc).toContain("Phase 3");
  });

  it("positions the homepage around launch-ready ecommerce stand sales", () => {
    const homepage = readFileSync("src/app/page.tsx", "utf8");
    const websiteContent = readFileSync("src/lib/website-content.ts", "utf8");

    expect(homepage).toContain("NFC & QR Stands for Reviews, Menus, Booking, Social Media and More");
    expect(homepage).toContain("getHomepageThemeContent");
    expect(websiteContent).toContain("Shop Stands");
    expect(websiteContent).toContain("does not require a Tap Rater account, hosted redirect, activation, or subscription");
  });

  it("documents the platform domain split, redirect engine, and database entities", () => {
    const doc = readFileSync("docs/platform-architecture.md", "utf8");

    expect(doc).toContain("Marketing site: `taprater.com`");
    expect(doc).toContain("Customer portal: `app.taprater.com`");
    expect(doc).toContain("Redirect engine: `/r/{deviceCode}`");
    expect(doc).toContain("`r.taprater.com/{token}`");
    for (const entity of [
      "customer",
      "business",
      "location",
      "device",
      "landing_page",
      "tap_event",
      "feedback_submission",
      "product",
      "quote_request",
      "order",
      "subscription"
    ]) {
      expect(doc).toContain(`\`${entity}\``);
    }
    expect(doc).toContain("Products connect to activation, accounts, landing pages, and dashboards");
  });

  it("documents the MVP phases without enabling live Stripe", () => {
    const doc = readFileSync("docs/mvp-scope.md", "utf8");

    expect(doc).toContain("Phase 1");
    expect(doc).toContain("marketing pages");
    expect(doc).toContain("expanded product catalog");
    expect(doc).toContain("device activation");
    expect(doc).toContain("basic tap analytics");
    expect(doc).toContain("Phase 2");
    expect(doc).toContain("hosted landing pages");
    expect(doc).toContain("feedback forms");
    expect(doc).toContain("Phase 3");
    expect(doc).toContain("Stripe live checkout only after approval");
  });
});
