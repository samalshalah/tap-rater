"use client";
import { Check, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { searchGoogleBusinesses, type GoogleBusinessSelection } from "@/lib/google-places-client";

/**
 * Business name for a Multi-Link page, with Google Business search: picking a result fills the
 * name and hands back the "write a review" link for the page's Google button.
 */
export function MultiLinkBusinessSearch({
  businessName,
  setBusinessName,
  onPickGoogleReview
}: {
  businessName: string;
  setBusinessName: (value: string) => void;
  onPickGoogleReview: (reviewUrl: string) => void;
}) {
  const [picked, setPicked] = useState<GoogleBusinessSelection | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [results, setResults] = useState<GoogleBusinessSelection[]>([]);
  const query = businessName.trim();
  const searching = !picked || picked.name !== businessName;

  useEffect(() => {
    if (!searching || query.length < 3) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      searchGoogleBusinesses(query, controller.signal)
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
  }, [query, searching]);

  function pick(place: GoogleBusinessSelection) {
    setPicked(place);
    setBusinessName(place.name);
    setResults([]);
    onPickGoogleReview(place.reviewUrl);
  }

  return (
    <div className="grid gap-2">
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Business or page name
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            className="tr-input pl-10"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Business name and city"
            autoComplete="off"
          />
        </span>
      </label>

      {!searching && picked ? (
        <p className="flex items-start gap-2 rounded-md border border-line bg-soft p-2 text-sm text-ink" role="status">
          <Check size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <span>
            Google review link added to your page.
            {picked.formattedAddress ? <span className="block text-xs text-muted">{picked.formattedAddress}</span> : null}
          </span>
        </p>
      ) : null}
      {searching && status === "idle" ? <p className="text-xs text-muted">Type your business name to find it on Google. We’ll add your Google review link for you.</p> : null}
      {searching && status === "loading" ? <p className="text-xs text-muted" role="status">Searching Google…</p> : null}
      {searching && status === "fallback" ? <p className="text-xs text-muted" role="status">Google search is unavailable right now. You can add the review link on the Links step.</p> : null}
      {searching && status === "ready" && !results.length ? <p className="text-xs text-muted" role="status">No match on Google. Add the city, or keep the name as typed.</p> : null}
      {searching && results.length > 0 ? (
        <div className="grid overflow-hidden rounded-md border border-line bg-white" role="listbox" aria-label="Google Business results">
          {results.map((place) => (
            <button
              key={place.placeId}
              type="button"
              role="option"
              aria-selected={false}
              className="border-b border-line px-3 py-2 text-left text-sm last:border-b-0 hover:bg-soft"
              onClick={() => pick(place)}
            >
              <span className="block font-semibold text-ink">{place.name}</span>
              {place.formattedAddress ? <span className="block text-xs text-muted">{place.formattedAddress}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
