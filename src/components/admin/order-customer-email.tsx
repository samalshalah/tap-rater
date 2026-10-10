"use client";
import { useEffect, useState } from "react";
type Data = { email: string; legacy: boolean; testRecipient?: string; draft: { subject: string; message: string }; reminder: { subject: string; message: string }; state?: { paused: boolean; consent_at?: string; last_error?: string }; history: { subject: string; status: string; created_at: string }[]; related: { id: string; status: string }[] };
export function OrderCustomerEmail({ orderId }: { orderId: string }) {
  const [data, setData] = useState<Data>(), [subject, setSubject] = useState(""), [message, setMessage] = useState(""), [html, setHtml] = useState(""), [status, setStatus] = useState(""), [busy, setBusy] = useState(false), [reviewed, setReviewed] = useState(false), [legacyApproved, setLegacyApproved] = useState(false);
  const endpoint = `/api/admin/orders/${orderId}/customer-email`;
  async function refresh(initial = false) { const r = await fetch(endpoint); if (!r.ok) throw new Error(); const next: Data = await r.json(); setData(next); if (initial) { setSubject(next.draft.subject); setMessage(next.draft.message); } }
  useEffect(() => { refresh(true).catch(() => setStatus("Email controls could not be loaded.")); }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function action(action: string) {
    setBusy(true); setStatus("");
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, subject, message, reviewed, legacyApproved }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error || "Request failed.");
      if (result.html) setHtml(result.html);
      else { setStatus(action === "send" ? "Email accepted for sending. See delivery history below." : action === "save" ? "Draft saved. Nothing sent." : action === "test" ? "Preview sent to the administrator. Its button opens support, not payment." : "Reminder status updated."); await refresh(); }
    } catch (error) { setStatus(error instanceof Error ? error.message : "Email request failed."); } finally { setBusy(false); }
  }
  return <section className="tr-admin-card space-y-4 p-5">
    <h2 className="text-lg font-semibold">Send customer email</h2>
    {data && <><p className="break-all text-sm">To: <strong>{data.email}</strong></p><p className="text-xs text-muted">From orders@taprater.com · Replies to support@taprater.com</p>
      <label className="block text-sm">Start with a template<select className="tr-input mt-2 w-full" defaultValue="personal" onChange={e => { const copy = e.target.value === "personal" ? data.draft : data.reminder; setSubject(copy.subject); setMessage(copy.message); setHtml(""); setReviewed(false); }}><option value="personal">Personal payment invitation</option><option value="reminder">Saved order reminder</option></select></label>
      <label className="block text-sm">Subject<input className="tr-input mt-2 w-full" maxLength={180} value={subject} onChange={e => { setSubject(e.target.value); setHtml(""); setReviewed(false); }} /></label>
      <label className="block text-sm">Personal message<textarea className="tr-input mt-2 min-h-56 w-full" maxLength={2000} value={message} onChange={e => { setMessage(e.target.value); setHtml(""); setReviewed(false); }} /></label>
      <p className="text-xs text-muted">The saved products, total, payment button, and footer are added automatically. Previews cannot collect payment.</p>
      <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => action("preview")} className="tr-button-outline">Preview</button><button disabled={busy} onClick={() => action("save")} className="tr-button-outline">Save draft</button><button disabled={busy || !data.testRecipient} onClick={() => action("test")} className="tr-button-outline">Send test to admin</button></div>
      {html && <iframe title="Payment invitation preview" sandbox="" srcDoc={html} className="h-[620px] w-full rounded-lg border border-line bg-white" />}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I reviewed this recipient, the saved price and artwork, and confirmed payment has not already been collected.</label>
      {data.legacy && <label className="flex gap-2 text-sm"><input type="checkbox" checked={legacyApproved} onChange={e => setLegacyApproved(e.target.checked)} />This legacy/test checkout is a real customer order. Allow a live payment invitation at the saved price.</label>}
      <button className="tr-button-primary w-full" disabled={busy || !reviewed || (data.legacy && !legacyApproved)} onClick={() => action("send")}>Send invitation to customer</button>
      <div className="border-t border-line pt-4 text-sm"><p>Automatic reminders: {data.state?.paused ? "Paused" : data.state?.consent_at ? "Enrolled with customer permission" : "Not enrolled"}</p><button disabled={busy} className="mt-2 underline" onClick={() => action(data.state?.paused ? "resume" : "pause")}>{data.state?.paused ? "Resume reminders" : "Pause reminders"}</button>{data.state?.last_error && <p className="mt-2 text-xs text-muted">Last check: {data.state.last_error}</p>}</div>
      {data.related.length > 0 && <div className="text-sm"><strong>Linked payment checkouts</strong>{data.related.map(o => <a className="mt-2 block underline" key={o.id} href={`/admin/orders/${o.id}`}>View linked order · {o.status.replaceAll("_", " ")}</a>)}</div>}
      <div className="border-t border-line pt-4"><h3 className="font-semibold">Email history</h3>{data.history.length ? data.history.map((item, i) => <div key={i} className="mt-3 text-sm"><p>{item.subject}</p><p className="text-xs text-muted">{item.status} · {new Date(item.created_at).toLocaleString()}</p></div>) : <p className="mt-2 text-sm text-muted">No payment invitations or reminders sent.</p>}</div>
    </>}
    <p role="status" className="text-sm">{status}</p>
  </section>;
}
