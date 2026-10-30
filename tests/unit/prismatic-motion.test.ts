import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Approval lock: deliberate motion changes require the user's approval and new hashes.
describe("approved Prismatic motion", () => {
  const approved = [
    ["src/components/prismatic/Wave.jsx", "211592cae7d3f91e458c785cbf3910db7320d074185c313adf3b82186a4f8ba6"],
    ["public/assets/wave-palette.webp", "dddcbdc6d7067aa190584c10cd004f7f7ff156ac9feab4fccacc89a29d54c32e"],
    ["public/assets/wave-fallback.webp", "2daf8ce7404a849937a47041584d5d1818ce7fd3e8712b5bfb1d6961f0e3f679"],
  ];
  for (const [file, sha256] of approved) {
    it(`preserves ${file} byte for byte`, () => {
      expect(createHash("sha256").update(readFileSync(resolve(file))).digest("hex")).toBe(sha256);
    });
  }
});
