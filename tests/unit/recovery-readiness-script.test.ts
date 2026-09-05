import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("recovery readiness script", () => {
  it("validates deployment, storage, rate-limit, schema, and runbook configuration", () => {
    const output = execFileSync(process.execPath, ["scripts/check-recovery-readiness.mjs"], { encoding: "utf8" });

    expect(output).toMatch(/Recovery readiness configuration passed \d+ checks\./u);
  });
});
