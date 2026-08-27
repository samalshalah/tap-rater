import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("product detail route", () => {
  const source = readFileSync(join(process.cwd(), "src/app/product/[slug]/page.tsx"), "utf8");

  it("does not statically limit product detail slugs to the legacy catalog", () => {
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain("export const dynamicParams = true");
    expect(source).toContain("export const revalidate = 0");
    expect(source).not.toMatch(/export\s+(async\s+)?function\s+generateStaticParams/);
    expect(source).not.toContain("@/data/migrated-products");
  });

  it("permanently redirects legacy product slugs through the canonical slug helper", () => {
    expect(source).toContain("getCanonicalProductSlug");
    expect(source).toContain("permanentRedirect(`/product/${canonicalSlug}`)");
    expect(source).not.toContain('"book-your-next-visit-stand": "book-appointment-stand"');
    expect(source).not.toContain('"view-our-menu-stand": "view-menu-stand"');
  });
});
