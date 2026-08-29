import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/admin/product-editor.tsx", "utf8");

describe("admin product editor Multi-Link add-on controls", () => {
  it("shows Multi-Link as a services add-on instead of an operational product type", () => {
    expect(source).toContain('EditorCard title="Services & Add-ons"');
    expect(source).toContain("Supports Multi-Link");
    expect(source).toContain("setSupportsMultiLink(event.target.checked)");
    expect(source).not.toContain('<option value="hosted_multilink">Hosted Multi-Link</option>');
  });
});
