"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
import { GoogleBusinessSearch } from "@/components/activation/google-business-search";
import { normalizeGoogleReviewLink } from "@/lib/google-review";

export function ReviewLinkTool() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const link = normalizeGoogleReviewLink(value);

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Link copied.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setStatus("Clipboard unavailable. Your link is selected for copying.");
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <GoogleBusinessSearch onConfirm={(place) => { setValue(place.reviewUrl); setStatus(""); }} />
      <label className="grid min-w-0 gap-2 text-sm font-semibold">
        Google review link
        <input ref={input} type="url" className="tr-input min-w-0 w-full" value={value}
          placeholder="https://search.google.com/local/writereview?placeid=..."
          onChange={(event) => { setValue(event.target.value); setStatus(""); }}
          aria-invalid={Boolean(value && !link)} aria-describedby="review-link-status" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="tr-button-primary gap-2 disabled:opacity-50" disabled={!link} onClick={copyLink}>
          {status === "Link copied." ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} Copy link
        </button>
        {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="tr-button-outline gap-2"><ExternalLink size={16} aria-hidden="true" /> Open Google</a> : null}
      </div>
      <p id="review-link-status" role="status" className="min-h-6 text-sm text-muted">
        {value && !link ? "Enter a Google review link from your Business Profile or select a search result." : status}
      </p>
    </div>
  );
}
