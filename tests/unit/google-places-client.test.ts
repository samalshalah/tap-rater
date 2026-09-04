import { afterEach, describe, expect, it, vi } from "vitest";
import { searchGoogleBusinesses } from "@/lib/google-places-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Google Places client", () => {
  it("does not call the API for short queries", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchGoogleBusinesses("ab")).resolves.toEqual({ configured: true, results: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns normalized server-side search results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      configured: true,
      results: [{
        placeId: "place-1",
        name: "Tap Rater",
        formattedAddress: "Richmond, VA",
        reviewUrl: "https://search.google.com/local/writereview?placeid=place-1"
      }]
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchGoogleBusinesses("Tap Rater Richmond");

    expect(result.results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/setup/google-places?q=Tap%20Rater%20Richmond",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });

  it("rejects failed API responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: "Search for a business name or address."
    }), { status: 400 })));

    await expect(searchGoogleBusinesses("bad query")).rejects.toThrow("Search for a business name or address.");
  });
});
