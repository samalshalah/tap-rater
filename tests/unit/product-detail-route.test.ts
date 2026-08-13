import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("product detail route", () => {
  const source = readFileSync(join(process.cwd(), "src/app/product/[slug]/page.tsx"), "utf8");

  it("does not statically limit product detail slugs to the legacy catalog", () => {
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).not.toMatch(/export\s+(async\s+)?function\s+generateStaticParams/);
    expect(source).not.toContain("@/data/migrated-products");
  });
});
