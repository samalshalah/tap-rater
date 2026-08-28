import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Multi-Link public page", () => {
  const source = readFileSync(join(process.cwd(), "src/app/multi-link/page.tsx"), "utf8");

  it("markets Multi-Link as a service add-on and only lists compatible products", () => {
    expect(source).toContain("One stand. Up to 10 links. Update them anytime.");
    expect(source).toContain("productSupportsMultiLink");
    expect(source).toContain("Shop Compatible Stands");
    expect(source).not.toContain("Multi-Link Stand");
  });
});
