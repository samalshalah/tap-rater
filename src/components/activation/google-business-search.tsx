"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { searchGoogleBusinesses, type GoogleBusinessSelection } from "@/lib/google-places-client";

type GoogleBusinessSearchProps = {
  onConfirm: (place: GoogleBusinessSelection) => void;
};

export type { GoogleBusinessSelection } from "@/lib/google-places-client";

export function GoogleBusinessSearch({ onConfirm }: GoogleBusinessSearchProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [results, setResults] = useState<GoogleBusinessSelection[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GoogleBusinessSelection | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) {
      setResults([]);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      searchGoogleBusinesses(normalizedQuery, controller.signal)
        .then((result) => {
          setResults(result.results);
          setStatus(result.configured && !result.message ? "ready" : "fallback");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResults([]);
          setStatus("fallback");
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function selectPlace(place: GoogleBusinessSelection) {
    setSelectedPlace(place);
    setQuery(`${place.name}${place.formattedAddress ? ` - ${place.formattedAddress}` : ""}`);
    setResults([]);
  }

  return (
    <div className="grid gap-3 rounded-md border border-line bg-soft p-4">
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Search Google Business Profile
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-brand"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedPlace(null);
            }}
            placeholder="Business name and city"
            autoComplete="off"
          />
        </div>
      </label>

      {status === "idle" ? <p className="text-sm text-muted">Enter at least 3 characters to search.</p> : null}
      {status === "loading" ? <p className="text-sm text-muted">Searching Google Business Profiles...</p> : null}
      {status === "fallback" ? <p className="text-sm text-muted">Google search is unavailable right now. Paste your Google review URL manually below.</p> : null}
      {status === "ready" && query.trim().length >= 3 && results.length === 0 && !selectedPlace ? (
        <p className="text-sm text-muted">No matching businesses found. Add a city or paste the review URL manually.</p>
      ) : null}

      {results.length > 0 ? (
        <div className="grid overflow-hidden rounded-md border border-line bg-white" role="listbox" aria-label="Google Business search results">
          {results.map((place) => (
            <button
              key={place.placeId}
              type="button"
              role="option"
              aria-selected={selectedPlace?.placeId === place.placeId}
              onClick={() => selectPlace(place)}
              className="border-b border-line px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-soft"
            >
              <span className="block font-semibold text-ink">{place.name}</span>
              {place.formattedAddress ? <span className="mt-1 block text-muted">{place.formattedAddress}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {selectedPlace ? (
        <div className="rounded-md border border-line bg-white p-4 text-sm">
          <p className="font-bold text-ink">{selectedPlace.name}</p>
          {selectedPlace.formattedAddress ? <p className="mt-1 text-muted">{selectedPlace.formattedAddress}</p> : null}
          <p className="mt-3 break-all text-brand">{selectedPlace.reviewUrl}</p>
          <button
            type="button"
            onClick={() => onConfirm(selectedPlace)}
            className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-brand"
          >
            Use this Google review link
          </button>
        </div>
      ) : null}
    </div>
  );
}
