import { NextResponse } from "next/server";
import { generateGoogleReviewUrl } from "@/lib/google-review";

export const dynamic = "force-dynamic";

type GooglePlacesTextSearchResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
};

type GooglePlacesTextSearchResponse = {
  results?: GooglePlacesTextSearchResult[];
  status?: string;
  error_message?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (query.length < 3 || query.length > 160) {
    return NextResponse.json({ ok: false, error: "Search for a business name or address." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      configured: false,
      results: [],
      message: "Search is unavailable right now. Paste your Google review link manually."
    });
  }

  const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(searchUrl, {
      headers: { Accept: "application/json" }
    });
    const body = (await response.json().catch(() => ({}))) as GooglePlacesTextSearchResponse;

    if (!response.ok || (body.status && !["OK", "ZERO_RESULTS"].includes(body.status))) {
      return NextResponse.json({
        ok: true,
        configured: true,
        results: [],
        message: "Search is unavailable right now. Paste your Google review link manually."
      });
    }

    const results = (body.results ?? []).slice(0, 6).flatMap((place) => {
      if (!place.place_id || !place.name) {
        return [];
      }

      return [
        {
          placeId: place.place_id,
          name: place.name,
          formattedAddress: place.formatted_address ?? "",
          reviewUrl: generateGoogleReviewUrl(place.place_id)
        }
      ];
    });

    return NextResponse.json({ ok: true, configured: true, results });
  } catch {
    return NextResponse.json({
      ok: true,
      configured: true,
      results: [],
      message: "Search is unavailable right now. Paste your Google review link manually."
    });
  }
}
