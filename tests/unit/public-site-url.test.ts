import { describe, expect, it } from "vitest";
import { getPublicSiteUrl } from "@/lib/public-site-url";

describe("public site URL", () => {
  it("never publishes localhost URLs from a production build", () => {
    expect(getPublicSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toBe("https://taprater.com");
    expect(getPublicSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3020" })).toBe("https://taprater.com");
  });

  it("keeps local URLs available during development", () => {
    expect(getPublicSiteUrl({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://localhost:3000/" })).toBe("http://localhost:3000");
  });

  it("normalizes a configured public origin", () => {
    expect(getPublicSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://www.taprater.com/" })).toBe("https://www.taprater.com");
  });
});
