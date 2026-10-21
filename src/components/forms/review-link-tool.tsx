"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
import Link from "next/link";
import { reviewLinkDraftKey } from "@/lib/review-link-draft";
import { GoogleBusinessSearch } from "@/components/activation/google-business-search";
import { normalizeGoogleReviewLink } from "@/lib/google-review";

export function ReviewLinkTool() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [businessName, setBusinessName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const link = normalizeGoogleReviewLink(value);

  function saveStandDraft() {
    try {
      sessionStorage.setItem(reviewLinkDraftKey, JSON.stringify({ url: link, businessName, createdAt: Date.now() }));
    } catch { /* The copy button and manual entry remain available. */ }
  }

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
      <GoogleBusinessSearch onConfirm={(place) => { setValue(place.reviewUrl); setBusinessName(place.name); setStatus(""); }} />
      <label className="grid min-w-0 gap-2 text-sm font-semibold">
        Google review link
        <input ref={input} type="url" className="tr-input min-w-0 w-full" value={value}
          placeholder="https://search.google.com/local/writereview?placeid=..."
          onChange={(event) => { setValue(event.target.value); setBusinessName(""); setStatus(""); }}
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
      {link ? (
        <section className="rounded-xl border border-line bg-soft p-5" aria-labelledby="ready-review-link">
          <h2 id="ready-review-link" className="text-xl font-semibold">Your link is ready. Put it on your counter.</h2>
          <p className="mt-3 text-sm leading-6 text-muted">A Tap Rater Review Stand for Google Reviews opens this link with an NFC tap. Standard is NFC-only; Branded adds your logo and a printed QR code. Direct stands need no subscription.</p>
          <div className="mt-4 grid gap-3">
            <Link href="/product/google-review-stand?design=standard&setup=review" className="tr-button-primary text-center" onClick={saveStandDraft}>Use this link on a standard stand</Link>
            <Link href="/product/google-review-stand?design=branded&setup=review" className="tr-button-outline text-center" onClick={saveStandDraft}>Add my logo + QR</Link>
          </div>
          <p className="mt-3 text-sm text-muted">Your link and business name carry over. Check your setup and price before adding to cart. Keep a copy of your link if your browser blocks storage.</p>
        </section>
      ) : null}
    </div>
  );
}
