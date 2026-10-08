import { describe, expect, it } from "vitest";
import { formatOrderReference } from "@/lib/order-reference";

describe("customer order numbers", () => {
  it.each([
    `cs_test_${"a".repeat(70)}`,
    `cs_live_${"a".repeat(70)}`,
    "manual_0ed962ff-f896-429a-85e2-f90695fb6752",
    "TR-260901-AB12CD",
    "0ed962ff-f896-429a-85e2-f90695fb6752"
  ])("formats %s consistently as ten uppercase letters and digits", (reference) => {
    const short = formatOrderReference(reference);
    expect(short).toMatch(/^[A-Z0-9]{10}$/);
    expect(formatOrderReference(` ${reference} `)).toBe(short);
    expect(formatOrderReference(short)).toBe(short);
  });

  it("uses the entire case-sensitive payment reference, including its mode and suffix", () => {
    const references = ["cs_test_Example123", "cs_test_example123", "cs_live_Example123", "cs_test_Example124"];
    expect(new Set(references.map(formatOrderReference)).size).toBe(references.length);
  });

  it("does not invent an order number without an underlying reference", () => {
    expect(formatOrderReference(null)).toBe("Pending");
    expect(formatOrderReference(" ")).toBe("Pending");
  });

  it("keeps already-issued display numbers stable across future releases", () => {
    expect(formatOrderReference(`cs_test_${"a".repeat(70)}`)).toBe("7DXTE2XW0J");
  });
});
