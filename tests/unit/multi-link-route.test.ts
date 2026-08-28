import { describe, expect, it } from "vitest";
import { GET } from "@/app/multi-link/route";

describe("Multi-Link public route", () => {
  it("is intentionally unavailable while Hosted purchasing is deferred", async () => {
    const response = await GET();

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("X-Tap-Rater-Multi-Link-State")).toBe("inactive");
  });
});
