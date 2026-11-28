"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AdminButton, AdminInput } from "@/components/admin/admin-ui";
import { ReviewInviteUpload } from "@/components/admin/review-invite-upload";
import { invitationCopy, invitationSubject } from "@/lib/product-review-shared";
import type { ReviewInvitation } from "@/lib/product-reviews";

export function ProductReviewsManager() {
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [rows, setRows] = useState<ReviewInvitation[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    let active = true; setLoading(true);
    fetch(`/api/admin/product-reviews?page=${page}`, { cache: "no-store" }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Reviews could not be loaded.");
      if (active) { setRows(data.rows); setTotal(data.total); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, refresh]);
  async function action(payload: Record<string, string>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/product-reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Please try again.");
      setMessage(success); setRefresh(v => v + 1); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setRefresh(v => v + 1); return false; }
    finally { setBusy(false); }
  }
  async function invite(event: FormEvent) {
    event.preventDefault();
    if (await action({ action: "invite", name, email }, `Invitation accepted for sending to ${email}. Delivery updates appear in Emails & Notifications.`)) { setName(""); setEmail(""); setPage(1); }
  }
  return <div className="mt-6 space-y-6">
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={invite} className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Invite a customer</h2><p className="mt-2 text-sm text-muted">Custom Google Review Stand. Invite real customers, including purchases made before this website launched.</p>
        <label className="mt-5 block text-sm font-semibold">Customer name<AdminInput className="mt-2" value={name} onChange={e => setName(e.target.value)} required maxLength={100} autoComplete="off" /></label>
        <label className="mt-4 block text-sm font-semibold">Customer email<AdminInput className="mt-2" type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="off" /></label>
        <p className="mt-4 text-sm leading-6 text-muted">The personal link opens a rating and feedback form with an optional shop photo. Reviews remain private until you publish them with the customer's permission.</p>
        <AdminButton type="submit" variant="primary" disabled={busy} className="mt-5">{busy ? "Working…" : "Send review invitation"}</AdminButton>
      </form>
      <div className="rounded-xl border border-line bg-[#f6f8ff] p-5 sm:p-6"><h2 className="text-lg font-semibold">Email preview</h2><p className="mt-3 text-sm font-semibold">Subject: {invitationSubject}</p><div className="mt-4 space-y-3 text-sm leading-6">{invitationCopy(name.trim() || "[Customer name]").map((line, index) => <p key={index}>{line}</p>)}</div><span className="mt-4 inline-block rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">Share your experience</span><p className="mt-3 text-xs text-muted">The button will contain the customer's private form link.</p></div>
    </div>
    <ReviewInviteUpload onSent={() => { setPage(1); setRefresh(v => v + 1); }} />
    {message ? <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">{message}</p> : null}
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Invitations & customer feedback</h2><Link className="text-sm font-semibold text-brand underline" href="/admin/settings/emails">Emails & Notifications</Link></div><p className="mt-2 text-sm text-muted">Moderate for authenticity, relevance, and privacy—not for a positive rating. Sending an invitation alone does not verify a purchase.</p>
      {loading ? <p className="mt-5" role="status">Loading feedback…</p> : rows.length === 0 ? <div className="mt-5 rounded-xl border border-line bg-white p-6 text-sm text-muted">No invitations yet. Add a customer's name and email above to get started.</div> : <div className="mt-5 space-y-4">{rows.map(row => <article key={row.id} className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{row.customer_name}</h3><p className="break-all text-sm text-muted">{row.email}</p></div><p className="text-sm font-medium">{row.rating !== null ? row.moderation_status === "published" ? "Published" : row.moderation_status === "private" ? "Kept private" : "Awaiting review" : row.email_status === "sent" ? "Invitation sent" : row.email_status === "failed" ? "Send failed" : "Sending"}</p></div>
        <p className="mt-2 text-xs text-muted">{row.submitted_at ? "Received" : "Invited"}: {new Date(row.submitted_at || row.created_at).toLocaleString()} · Link expires {new Date(row.expires_at).toLocaleDateString()}</p>
        {row.rating !== null ? <div className="mt-4 space-y-3"><p className="font-semibold">{row.rating}/5 stars · {row.display_name}{row.business_name ? ` · ${row.business_name}` : ""}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{row.review_body}</p>{row.photo_key ? <a href={`/api/product-reviews/photo/${row.id}`} target="_blank" rel="noreferrer"><img src={`/api/product-reviews/photo/${row.id}`} alt="Customer's stand in their shop" className="mt-3 max-h-56 w-auto max-w-full rounded-lg" loading="lazy" /></a> : null}<p className="text-xs text-muted">Review publication: {row.publish_permission ? "Allowed by customer" : "No permission — keep private"}{row.photo_key ? ` · Photo: ${row.photo_permission ? "Publication allowed" : "Private only"}` : ""}</p><div className="flex flex-wrap gap-3"><AdminButton disabled={busy || !row.publish_permission || row.moderation_status === "published"} variant="primary" onClick={() => void action({ action: "moderate", id: row.id, status: "published" }, "Review published on the product page.")}>Publish review</AdminButton><AdminButton disabled={busy || row.moderation_status === "private"} onClick={() => void action({ action: "moderate", id: row.id, status: "private" }, "Review kept private.")}>{row.moderation_status === "published" ? "Unpublish" : "Keep private"}</AdminButton></div></div> : <div className="mt-4"><AdminButton disabled={busy || (row.email_status === "sent" && Boolean(row.sent_at) && Date.now() - new Date(row.sent_at!).getTime() < 86400000)} onClick={() => void action({ action: "invite", name: row.customer_name, email: row.email }, `Invitation accepted for sending to ${row.email}.`)}>{row.email_status === "failed" ? "Retry invitation" : "Resend invitation"}</AdminButton><p className="mt-2 text-xs text-muted">Resending is limited to once every 24 hours. Please avoid repeated requests.</p></div>}
      </article>)}</div>}
      <div className="mt-5 flex items-center gap-3"><AdminButton disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}>Previous</AdminButton><span className="text-sm">Page {page} · {total} invitation{total === 1 ? "" : "s"}</span><AdminButton disabled={loading || page * 25 >= total} onClick={() => setPage(p => p + 1)}>Next</AdminButton></div>
    </section>
  </div>;
}
