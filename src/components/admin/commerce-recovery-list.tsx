"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import type { CommerceRecoveryJob } from "@/lib/commerce-recovery";
import { AdminAlert, AdminButton } from "@/components/admin/admin-ui";

export function CommerceRecoveryList({ available, jobs }: { available: boolean; jobs: CommerceRecoveryJob[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function retry(id: string) {
    setPending(id); setError("");
    try {
      const response = await fetch("/api/admin/commerce-recovery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Recovery failed.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Recovery failed."); }
    finally { setPending(null); }
  }
  if (!available) return <AdminAlert tone="danger">Payment recovery records are unavailable.</AdminAlert>;
  return <div className="space-y-3">
    {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}
    {!jobs.length ? <p className="text-sm text-muted">No outstanding payment recovery tasks.</p> : jobs.map(job => <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold capitalize">{job.kind} recovery <span className="text-muted">({job.stripe_mode})</span></p>
        <p className="break-all font-mono text-xs text-muted">{job.object_id}</p>
        <p className="mt-1 text-sm">{job.last_error || "Processing or awaiting retry"}</p>
        <p className="text-xs text-muted">Attempts: {job.attempts}</p>
      </div>
      <AdminButton type="button" title="Retry payment recovery" disabled={pending !== null} loading={pending === job.id} onClick={() => retry(job.id)}><RotateCw size={16} />Retry</AdminButton>
    </div>)}
  </div>;
}
