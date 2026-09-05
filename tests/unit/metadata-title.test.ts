import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withoutSiteTitleSuffix } from "@/lib/metadata-title";

describe("page title branding", () => {
  it.each([
    ["Review Stands | Tap Rater", "Review Stands"],
    ["Review Stands | Tap Rater | Tap Rater", "Review Stands"],
    ["Reviews | NFC | tap rater  ", "Reviews | NFC"],
    ["Tap Rater Pricing", "Tap Rater Pricing"],
    ["Review Stands", "Review Stands"]
  ])("normalizes %s for the root template", (input, expected) => {
    expect(withoutSiteTitleSuffix(input)).toBe(expected);
  });

  it.each(["account/login", "account/activate", "account/forgot-password", "account/reset-password", "checkout", "checkout/cancel", "checkout/success", "multi-link"])("does not duplicate branding on %s", (route) => {
    const source = readFileSync(`src/app/${route}/page.tsx`, "utf8");
    expect(source).not.toMatch(/title: "[^"\n]*\| Tap Rater"/);
  });
});
