"use client";

import { useState } from "react";
import { AdminBadge, AdminButton } from "@/components/admin/admin-ui";

export function GoogleReviewsPreview() {
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  return <section className="mt-8 rounded-xl border border-line bg-white p-6" aria-labelledby="review-preview-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="review-preview-heading" className="tr-admin-card-title">Try the reply workflow</h2>
      <AdminBadge tone="warning">Sample data</AdminBadge>
    </div>
    <p className="mt-2 text-sm text-muted">This fictional review is for testing. Drafts stay on this page and are lost when you leave. Nothing is sent to Google.</p>
    <article className="mt-6 rounded-lg border border-line p-4">
      <p className="font-semibold">Sample customer · 5 out of 5 stars</p>
      <p className="mt-2">Friendly service and a great experience. Thank you!</p>
      <label htmlFor="google-reply-draft" className="mt-5 block text-sm font-semibold">Your reply</label>
      <textarea id="google-reply-draft" value={draft} onChange={(event) => { setDraft(event.target.value); setPreview(null); }} maxLength={4096} rows={4} className="mt-2 w-full rounded-lg border border-line p-3" placeholder="Write a personal reply to the customer…" />
      <div className="mt-3 flex flex-wrap gap-3">
        <AdminButton disabled={!draft.trim()} onClick={() => setPreview(draft.trim())}>Preview reply</AdminButton>
        <AdminButton disabled title="Live publishing requires API approval and a connected Google account">Publish to Google (not connected)</AdminButton>
      </div>
      {preview !== null && <div role="status" className="mt-4 rounded-lg bg-soft p-4"><p className="text-sm font-semibold">Reply preview — sample only</p><p className="mt-2 whitespace-pre-wrap break-words">{preview}</p></div>}
    </article>
  </section>;
}
