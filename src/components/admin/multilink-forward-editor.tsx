"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/admin-ui";

/**
 * Admin view of where an ended Multi-Link page sends visitors. `initial` is undefined when the
 * page loaded without reading it (live, renewing pages); it is then read when opened.
 */
export function MultiLinkForwardEditor({ code, initial }: { code: string; initial?: string | null }) {
  const [saved, setSaved] = useState<string | null | undefined>(initial);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setError("");
    if (saved === undefined) {
      setBusy(true);
      try {
        const response = await fetch(`/api/admin/multilink-forward?code=${code}`);
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "Could not load the forwarding link.");
        setSaved(body?.forwardUrl ?? null);
        setValue(body?.forwardUrl ?? "");
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Could not load the forwarding link.");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setEditing(true);
  }

  async function save(url: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/multilink-forward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, url }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "The forwarding link couldn’t be saved.");
      setSaved(body?.forwardUrl ?? null);
      setValue(body?.forwardUrl ?? "");
      setEditing(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The forwarding link couldn’t be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form className="grid min-w-56 gap-1.5" onSubmit={(event) => { event.preventDefault(); void save(value); }}>
        <input className="tr-input min-h-8 text-xs" type="url" inputMode="url" placeholder="https://their-website.com" value={value} maxLength={500} disabled={busy} onChange={(event) => setValue(event.target.value)} aria-label={`Forwarding link for ${code}`} autoFocus />
        <div className="flex flex-wrap gap-1.5">
          <AdminButton type="submit" variant="primary" className="min-h-8 px-2.5 text-xs" loading={busy}>Save</AdminButton>
          {saved ? <AdminButton type="button" className="min-h-8 px-2.5 text-xs" disabled={busy} onClick={() => void save("")}>Remove</AdminButton> : null}
          <AdminButton type="button" variant="ghost" className="min-h-8 px-2.5 text-xs" disabled={busy} onClick={() => { setEditing(false); setValue(saved ?? ""); setError(""); }}>Cancel</AdminButton>
        </div>
        {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
      </form>
    );
  }

  return (
    <div className="grid gap-1">
      {saved ? <a className="max-w-48 truncate text-xs text-brand underline" href={saved} target="_blank" rel="noopener noreferrer" title={saved}>{saved.replace(/^https:\/\//, "").replace(/\/$/, "")}</a>
        : saved === null ? <span className="text-xs text-muted">Shows “not active”</span> : null}
      <button type="button" className="w-fit text-xs font-semibold text-brand hover:underline disabled:opacity-50" disabled={busy} onClick={() => void open()}>{busy ? "Loading…" : saved ? "Change" : "Set link"}</button>
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
