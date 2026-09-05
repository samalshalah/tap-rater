import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("search indexing boundaries", () => {
  it("does not force the homepage canonical onto every route", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");

    expect(layout).not.toContain("canonical: \"/\"");
    expect(layout).not.toContain("url: \"/\"");
  });

  it("keeps Multi-Link in the sitemap without publishing false modification dates", () => {
    const sitemap = readFileSync("src/app/sitemap.ts", "utf8");

    expect(sitemap).toContain('"/multi-link"');
    expect(sitemap).not.toContain("lastModified: new Date()");
  });

  it("blocks private and action routes in robots policy", () => {
    const robots = readFileSync("src/app/robots.ts", "utf8");

    for (const route of ["/admin", "/account", "/api", "/cart", "/checkout", "/activate", "/p/", "/l/", "/r/"]) {
      expect(robots).toContain(`\"${route}\"`);
    }
  });
});
