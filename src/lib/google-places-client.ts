export type GoogleBusinessSelection = {
  placeId: string;
  name: string;
  formattedAddress: string;
  reviewUrl: string;
};

type GoogleBusinessSearchResponse = {
  ok?: boolean;
  configured?: boolean;
  results?: GoogleBusinessSelection[];
  error?: string;
  message?: string;
};

export async function searchGoogleBusinesses(query: string, signal?: AbortSignal) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3) {
    return { configured: true, results: [] as GoogleBusinessSelection[] };
  }

  const response = await fetch(`/api/setup/google-places?q=${encodeURIComponent(normalizedQuery)}`, {
    headers: { Accept: "application/json" },
    signal
  });
  const body = (await response.json().catch(() => ({}))) as GoogleBusinessSearchResponse;

  if (!response.ok || body.ok === false) {
    throw new Error(body.error || "Google Business search failed.");
  }

  return {
    configured: body.configured !== false,
    message: body.message,
    results: Array.isArray(body.results) ? body.results : []
  };
}
