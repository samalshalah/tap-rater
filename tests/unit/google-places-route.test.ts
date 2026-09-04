import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/setup/google-places/route";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("Google Places setup route", () => {
  it("reports unconfigured search when no Maps Platform key is set", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_PLATFORM_API_KEY;
    delete process.env.MAPS_PLATFORM_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const response = await GET(new Request("https://taprater.test/api/setup/google-places?q=coffee"));
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, configured: false, results: [] });
  });

  it("accepts MAPS_PLATFORM_API_KEY as a server-side Google Maps Platform key", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_PLATFORM_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    process.env.MAPS_PLATFORM_API_KEY = "maps-platform-test-key";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [{ place_id: "abc123", name: "Coffee Shop", formatted_address: "1 Main St" }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("https://taprater.test/api/setup/google-places?q=coffee"));
    const body = await response.json();
    const requestedUrl = new URL(fetchMock.mock.calls[0][0].toString());

    expect(requestedUrl.searchParams.get("key")).toBe("maps-platform-test-key");
    expect(body).toMatchObject({
      ok: true,
      configured: true,
      results: [{ placeId: "abc123", name: "Coffee Shop", formattedAddress: "1 Main St", reviewUrl: "https://search.google.com/local/writereview?placeid=abc123" }]
    });
  });

  it("returns Google status diagnostics without exposing the API key", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "places-test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "REQUEST_DENIED", error_message: "API key not allowed" })
      })
    );

    const response = await GET(new Request("https://taprater.test/api/setup/google-places?q=coffee"));
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, configured: true, results: [], googleStatus: "REQUEST_DENIED" });
    expect(JSON.stringify(body)).not.toContain("places-test-key");
  });
});
