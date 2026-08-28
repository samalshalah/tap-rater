import { afterEach, describe, expect, it, vi } from "vitest";

describe("public hosted page route", () => {
  afterEach(() => {
    delete process.env.TAP_RATER_ENABLE_PRODUCTION_HOSTED_PAGES;
    vi.resetModules();
  });

  it("keeps production /p routes inactive unless explicitly enabled", async () => {
    const { GET } = await import("@/app/p/[code]/route");
    const response = await GET(new Request("https://taprater.com/p/ABCDEFGHJKM2"), {
      params: Promise.resolve({ code: "ABCDEFGHJKM2" })
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(response.headers.get("X-Tap-Rater-Hosted-Page-State")).toBe("inactive");
  });

  it("validates hosted page codes when the route is explicitly enabled", async () => {
    process.env.TAP_RATER_ENABLE_PRODUCTION_HOSTED_PAGES = "true";
    vi.resetModules();

    const { GET } = await import("@/app/p/[code]/route");
    const response = await GET(new Request("https://taprater.com/p/invalid"), {
      params: Promise.resolve({ code: "invalid" })
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Tap-Rater-Hosted-Page-State")).toBe("not_found");
  });
});
