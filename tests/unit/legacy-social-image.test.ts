import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import config from "../../next.config";

vi.mock("@opennextjs/cloudflare", () => ({ initOpenNextCloudflareForDev: vi.fn() }));

describe("retired social stand image compatibility", () => {
  it.each([
    "/uploads/products/social-media-stand.png",
    ...[160, 640, 1200].map((width) => `/uploads-optimized/products/social-media-stand-w${width}.webp`)
  ])("internally resolves %s to an existing current asset", async (source) => {
    const rewrites = await config.rewrites!();
    expect(Array.isArray(rewrites)).toBe(true);
    if (!Array.isArray(rewrites)) throw new Error("Expected an array of asset rewrites");
    const rewrite = rewrites.find((entry) => entry.source === source);
    expect(rewrite?.destination).not.toBe(source);
    expect(existsSync(`public${rewrite?.destination}`)).toBe(true);
    const redirects = await config.redirects!();
    expect(redirects.some((entry) => entry.source === source)).toBe(false);
  });
});
