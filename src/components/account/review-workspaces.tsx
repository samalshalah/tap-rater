"use client";
import { ReviewAiSuggestions, ReviewAutoSettings } from "./review-ai-controls";
import { useState } from "react";
import type { ReviewWorkspace, SampleReview } from "@/lib/review-workspaces";

function ReviewCard({ review, endpoint }: { review: SampleReview; endpoint: string }) {
  const [reply, setReply] = useState(review.reply);
  const [saved, setSaved] = useState(review);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const dirty = reply.trim() !== saved.reply;
  async function save(status: "draft" | "ready") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, reply, status, version: saved.version }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your reply.");
      setSaved({ ...saved, ...data.review }); setReply(data.review.reply);
      setMessage(status === "ready" ? "Saved as ready for practice. Nothing was sent to Google." : "Draft saved. You can return to it later.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save your reply."); }
    finally { setBusy(false); }
  }
  return <article className="tr-card p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">{review.reviewer} <span className="font-normal text-muted">· Fictional customer</span></h3>
      <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold">{dirty ? "Unsaved changes" : saved.status === "ready" ? "Ready · practice only" : saved.reply ? "Draft saved" : "Needs reply"}</span>
    </div>
    <p className="mt-2 text-sm font-semibold" aria-label={review.rating + " out of 5 stars"}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)} · {review.rating}/5</p>
    <p className="mt-3 text-sm leading-6">{review.comment}</p>
    <ReviewAiSuggestions id={review.id} endpoint={endpoint} disabled={busy} onChoose={suggestion=>{
      if(reply.trim() && !window.confirm("Replace the text in your reply box with this AI suggestion? Your saved draft stays unchanged until you save."))return;
      setReply(suggestion);setMessage("AI suggestion added. Review and edit it, then save your draft.");
    }} />
    <label className="mt-5 block text-sm font-semibold" htmlFor={"reply-"+review.id}>Your reply</label>
    <textarea id={"reply-"+review.id} value={reply} onChange={event => { setReply(event.target.value); setMessage(""); }} disabled={busy}
      maxLength={4000} rows={4} className="mt-2 w-full rounded-lg border border-line bg-white p-3 text-sm" placeholder="Thank the customer, address their experience, and offer a helpful next step." />
    <p className="mt-1 text-xs text-muted">{reply.length}/4,000 characters. Unsaved changes are lost when you leave.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button className="tr-button-primary" disabled={busy} onClick={() => save("draft")}>{busy ? "Saving…" : "Save draft"}</button>
      <button className="tr-button-ghost" disabled={!reply.trim()} onClick={() => setPreview(!preview)}>{preview ? "Hide preview" : "Preview reply"}</button>
      <button className="tr-button-ghost" disabled={busy || !reply.trim()} onClick={() => save("ready")}>Mark ready for practice</button>
    </div>
    {preview && <div className="mt-4 rounded-lg border border-line bg-soft p-4"><p className="text-xs font-semibold uppercase text-muted">Reply preview · sample only</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reply}</p></div>}
    <p role="status" aria-live="polite" className="mt-3 text-sm">{message}</p>
  </article>;
}
export function ReviewWorkspaces({ initialWorkspaces, endpoint }: { initialWorkspaces: ReviewWorkspace[]; endpoint: string }) {
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-semibold">Review workspace</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted">Practice reading reviews and preparing thoughtful replies. Save a draft, preview it, then mark it ready for practice.</p></header>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5"><p className="font-semibold">Sample mode · Waiting for Google API approval</p><p className="mt-2 text-sm leading-6">Every review below is fictional. Drafts are saved in Tap Rater and nothing is sent to Google. Sample replies will never be published or moved into live reviews.</p><button className="tr-button-ghost mt-3" disabled>Publish unavailable in sample mode</button></div>
    {!initialWorkspaces.length && <p className="tr-card p-6">No review workspace is assigned to your account yet. Contact Tap Rater support to get started.</p>}
    {initialWorkspaces.map(workspace => <section key={workspace.businessId} aria-label={workspace.businessName} className="space-y-4">
      <div><p className="tr-eyebrow">Business workspace</p><h2 className="mt-1 text-2xl font-semibold">{workspace.businessName}</h2><p className="mt-2 text-sm text-muted">{workspace.reviews.length} sample reviews</p></div>
      <ReviewAutoSettings businessId={workspace.businessId} initial={workspace.autoSettings} endpoint={endpoint} />
      <div className="grid gap-5 xl:grid-cols-2">{workspace.reviews.map(review => <ReviewCard key={review.id+":"+review.version} review={review} endpoint={endpoint} />)}</div>
    </section>)}
  </div>;
}
