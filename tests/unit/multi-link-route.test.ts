import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Multi-Link public page", () => {
  const source = readFileSync(join(process.cwd(), "src/app/multi-link/page.tsx"), "utf8");

  it("markets Multi-Link as a service add-on and only lists compatible products", () => {
    expect(source).toContain('title="Multi-Link NFC Stands for Business"');
    expect(source).toContain("productSupportsMultiLink");
    expect(source).toContain("Shop Compatible Stands");
    expect(source).toContain("plus the physical stand");
    expect(source).toContain("per hosted page");
  });
});
