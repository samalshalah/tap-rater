import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production security headers", () => {
  const source = readFileSync("next.config.ts", "utf8");

  it("sets browser hardening headers for every route", () => {
    expect(source).toContain('source: "/:path*"');
    expect(source).toContain("Content-Security-Policy");
    expect(source).toContain("Strict-Transport-Security");
    expect(source).toContain("X-Content-Type-Options");
    expect(source).toContain("X-Frame-Options");
    expect(source).toContain("Referrer-Policy");
  });

  it("allows the Stripe origins required by embedded checkout", () => {
    expect(source).toContain("https://js.stripe.com");
    expect(source).toContain("https://api.stripe.com");
    expect(source).toContain("https://hooks.stripe.com");
    expect(source).toContain("https://*.link.com");
  });

  it("allows the Cloudflare Web Analytics loader", () => {
    expect(source).toContain("https://static.cloudflareinsights.com");
  });

  it("prevents private and action routes from being indexed", () => {
    expect(source).toContain("X-Robots-Tag");
    expect(source).toContain("noindex, nofollow, noarchive");
    for (const route of ["/admin/:path*", "/account/:path*", "/api/:path*", "/cart", "/checkout/:path*"]) {
      expect(source).toContain(`\"${route}\"`);
    }
  });
});
