import { searchGoogleBusinesses, type GoogleBusinessSelection } from "./google-places-client";

export type GoogleAutocompleteStatus = "idle" | "loading" | "ready" | "fallback";

/** One editor effect owns the debounce and request; cleanup also ignores late responses. */
export function startProductGoogleSearch({ enabled, query, selectedPlaceId, onStatus, onResults }: {
  enabled: boolean;
  query: string;
  selectedPlaceId: string;
  onStatus: (status: GoogleAutocompleteStatus) => void;
  onResults: (results: GoogleBusinessSelection[]) => void;
}, search = searchGoogleBusinesses) {
  if (!enabled) return () => {};
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3 || selectedPlaceId) {
    onResults([]);
    onStatus("idle");
    return () => {};
  }
  let active = true;
  const controller = new AbortController();
  const timer = setTimeout(async () => {
    onStatus("loading");
    try {
      const result = await search(normalizedQuery, controller.signal);
      if (!active) return;
      onResults(result.results);
      onStatus(result.configured && !result.message ? "ready" : "fallback");
    } catch {
      if (!active) return;
      onResults([]);
      onStatus("fallback");
    }
  }, 350);
  return () => {
    active = false;
    clearTimeout(timer);
    controller.abort();
  };
}
