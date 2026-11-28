"use client";

import { useRef, useState } from "react";
import { AdminButton } from "@/components/admin/admin-ui";
import { readReviewImportFile, reviewImportRowLimit, type ReviewImportResult } from "@/lib/review-invite-import";

type SendState = "sent" | "skipped" | "failed";
type SendResult = { email: string; state: SendState; message?: string };

// Gap between emails so a large list stays well inside the email provider's sending limits.
const sendGapMs = 1100;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Bulk review invitations from an Excel or CSV list of past customers (name + email). */
export function ReviewInviteUpload({ onSent }: { onSent: () => void }) {
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ReviewImportResult | null>(null);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Record<string, SendResult>>({});
  const stopRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ready = result?.rows.filter((row) => row.status === "ready") ?? [];
  const done = Object.values(results);
  const counts = { sent: done.filter((r) => r.state === "sent").length, skipped: done.filter((r) => r.state === "skipped").length, failed: done.filter((r) => r.state === "failed").length };

  async function choose(file: File | undefined) {
    if (!file) return;
    setFileName(file.name); setResults({}); setResult(null);
    setResult(await readReviewImportFile(file));
  }

  async function sendAll() {
    if (!ready.length || !window.confirm(`Send ${ready.length} review invitation email${ready.length === 1 ? "" : "s"}? Each customer gets one personal link.`)) return;
    setSending(true); stopRef.current = false;
    for (const [index, row] of ready.entries()) {
      if (stopRef.current) break;
      if (results[row.email]?.state === "sent") continue;
      let next: SendResult;
      try {
        const response = await fetch("/api/admin/product-reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "invite", name: row.name, email: row.email }) });
        const data = await response.json().catch(() => ({}));
        next = response.ok ? { email: row.email, state: "sent" } : { email: row.email, state: response.status === 409 ? "skipped" : "failed", message: data.error || "Could not send." };
      } catch {
        next = { email: row.email, state: "failed", message: "Network error." };
      }
      setResults((current) => ({ ...current, [row.email]: next }));
      if (index < ready.length - 1) await wait(sendGapMs);
    }
    setSending(false); onSent();
  }

  function reset() {
    setFileName(""); setResult(null); setResults({});
    if (inputRef.current) inputRef.current.value = "";
  }

  return <section className="rounded-xl border border-line bg-white p-5 sm:p-6" aria-labelledby="bulk-invite-title">
    <h2 id="bulk-invite-title" className="text-lg font-semibold">Invite from a spreadsheet</h2>
    <p className="mt-2 text-sm text-muted">Upload an Excel (.xlsx) or CSV file of past buyers with a <strong>Name</strong> column (or First name / Last name) and an <strong>Email</strong> column. Up to {reviewImportRowLimit} rows per file. Only include real customers who bought from you.</p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <input ref={inputRef} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={sending}
        onChange={(event) => choose(event.target.files?.[0])} className="text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-soft file:px-3 file:py-2 file:text-sm file:font-semibold" aria-label="Customer list file" />
      {fileName && !sending ? <button type="button" className="text-sm font-semibold text-brand underline" onClick={reset}>Clear</button> : null}
    </div>

    {result?.error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{result.error}</p> : null}

    {result && !result.error ? <div className="mt-5">
      <p className="text-sm" role="status">
        <strong>{result.ready}</strong> ready to invite{result.skipped ? <> · <strong>{result.skipped}</strong> will be skipped (missing or invalid details, or repeated emails)</> : null}
        {result.truncated ? <> · only the first {reviewImportRowLimit} rows were read</> : null}
      </p>
      <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-soft text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>
            {result.rows.map((row) => {
              const sent = row.status === "ready" ? results[row.email] : undefined;
              const label = sent ? (sent.state === "sent" ? "Sent" : sent.state === "skipped" ? "Skipped: already invited or reviewed" : `Failed: ${sent.message}`) : row.status === "ready" ? "Ready" : row.reason;
              const tone = sent?.state === "sent" ? "text-green-700" : sent?.state === "failed" ? "text-red-700" : row.status === "ready" ? "text-ink" : "text-muted";
              return <tr key={`${row.line}:${row.email}`} className="border-t border-line"><td className="px-3 py-1.5 text-muted">{row.line}</td><td className="px-3 py-1.5">{row.name || "—"}</td><td className="break-all px-3 py-1.5">{row.email || "—"}</td><td className={`px-3 py-1.5 ${tone}`}>{label}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
      {done.length ? <p className="mt-3 text-sm" role="status">{sending ? `Sending ${done.length} of ${ready.length}…` : "Finished."} {counts.sent} sent · {counts.skipped} skipped · {counts.failed} failed</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {sending
          ? <AdminButton onClick={() => { stopRef.current = true; }}>Stop after this one</AdminButton>
          : <AdminButton variant="primary" disabled={!ready.length || counts.sent === ready.length} onClick={sendAll}>{done.length ? "Send the rest" : `Send ${ready.length} invitation${ready.length === 1 ? "" : "s"}`}</AdminButton>}
      </div>
      <p className="mt-3 text-xs text-muted">Emails go out about one per second. Keep this tab open until it finishes. Customers already invited in the last 24 hours, or who already left a review, are skipped automatically.</p>
    </div> : null}
  </section>;
}
