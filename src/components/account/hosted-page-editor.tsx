"use client";

import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Eye, Save, Upload } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { hostedPageButtonLimit, supportedHostedPageButtons, type HostedPageEditorButton, type HostedPageEditorDraft, type HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";

type EditorStatus = "idle" | "saving" | "saved" | "publishing" | "published" | "error";

export function HostedPageEditor({ initialPage }: { initialPage: HostedPageEditorRecord }) {
  const [page, setPage] = useState(initialPage);
  const [draft, setDraft] = useState<HostedPageEditorDraft>(initialPage.draft);
  const [previewHtml, setPreviewHtml] = useState("");
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [message, setMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const permanentUrl = `https://taprater.com/p/${page.code}`;
  const orderedButtons = useMemo(() => [...draft.buttons].sort((a, b) => a.position - b.position), [draft.buttons]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    void refreshPreview(draft);
  }, []);

  function updateDraft(next: HostedPageEditorDraft) {
    setDraft(next);
    setIsDirty(true);
    setStatus("idle");
    setMessage("");
  }

  function updateButton(id: string, patch: Partial<HostedPageEditorButton>) {
    updateDraft({
      ...draft,
      buttons: draft.buttons.map((button) => (button.id === id ? { ...button, ...patch } : button))
    });
  }

  function moveButton(id: string, direction: -1 | 1) {
    const buttons = [...orderedButtons];
    const index = buttons.findIndex((button) => button.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= buttons.length) return;
    const [button] = buttons.splice(index, 1);
    buttons.splice(nextIndex, 0, button);
    updateDraft({
      ...draft,
      buttons: buttons.map((item, position) => ({ ...item, position }))
    });
  }

  function addButton(type: HostedPageEditorButton["type"]) {
    if (draft.buttons.length >= hostedPageButtonLimit) {
      setStatus("error");
      setMessage(`Use ${hostedPageButtonLimit} or fewer buttons.`);
      return;
    }

    const catalog = supportedHostedPageButtons.find((button) => button.type === type);
    if (!catalog) return;
    updateDraft({
      ...draft,
      buttons: [
        ...orderedButtons,
        {
          id: `${type}-${crypto.randomUUID()}`,
          type,
          label: catalog.label,
          url: "",
          enabled: false,
          position: orderedButtons.length
        }
      ]
    });
  }

  async function saveDraft() {
    setStatus("saving");
    setMessage("");
    const response = await fetch("/api/account/hosted-page/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: page.code, draft })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? "Draft could not be saved.");
      return false;
    }

    setPage(body.page);
    setDraft(body.page.draft);
    setStatus("saved");
    setMessage("Draft saved. Your live page has not changed.");
    setIsDirty(false);
    return true;
  }

  async function publish() {
    setStatus("publishing");
    setMessage("");
    if (isDirty) {
      const saved = await saveDraft();
      if (!saved) return;
      setStatus("publishing");
    }

    const response = await fetch("/api/account/hosted-page/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: page.code })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? "We couldn't publish your changes. Your current live page is still available. Try again.");
      return;
    }

    setPage(body.page);
    setStatus("published");
    setMessage(`Published successfully. Permanent page: ${body.published?.permanentUrl ?? permanentUrl}`);
    await refreshPreview(draft);
  }

  async function refreshPreview(nextDraft = draft) {
    const response = await fetch("/api/account/hosted-page/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: page.code, draft: nextDraft })
    });
    const body = await response.json().catch(() => null);
    if (response.ok) setPreviewHtml(body.html ?? "");
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("saving");
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/account/hosted-page/logo", { method: "POST", body: form });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? "Your logo could not be uploaded. Please try again.");
      return;
    }

    updateDraft({ ...draft, logoUrl: body.asset?.url ?? "" });
    setStatus("idle");
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="grid gap-5">
        <div className="tr-card min-w-0 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="tr-eyebrow text-muted">Permanent URL</p>
              <p className="mt-1 break-all text-sm font-medium text-ink">{permanentUrl}</p>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <button type="button" onClick={() => navigator.clipboard?.writeText(permanentUrl)} className="tr-button-ghost text-sm">
                <Copy size={16} /> Copy
              </button>
              <a href={permanentUrl} target="_blank" rel="noreferrer" className="tr-button-ghost text-sm">
                <ExternalLink size={16} /> Open Page
              </a>
            </div>
          </div>
          <p className="mt-3 break-words text-sm text-muted">Code <span className="break-all">{page.code}</span> is permanent and cannot be edited.</p>
        </div>

        <div className="tr-card grid gap-4 p-5">
          <div>
            <p className="tr-eyebrow">Page information</p>
            <h2 className="tr-card-title mt-2">Business</h2>
          </div>
          <label className="tr-field-label">
            Business name
            <input className="tr-input" value={draft.businessName} onChange={(event) => updateDraft({ ...draft, businessName: event.target.value })} />
          </label>
          <label className="tr-field-label">
            Supporting text
            <input className="tr-input" value={draft.description ?? ""} onChange={(event) => updateDraft({ ...draft, description: event.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-[88px_1fr] sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
              {draft.logoUrl ? <img src={draft.logoUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-xs font-medium text-muted">Logo</span>}
            </div>
            <label className="tr-button-secondary w-fit cursor-pointer text-sm">
              <Upload size={16} /> Upload logo
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} className="sr-only" />
            </label>
          </div>
        </div>

        <div className="tr-card grid gap-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="tr-eyebrow">Buttons / links</p>
              <h2 className="tr-card-title mt-2">Your Links</h2>
            </div>
            <select className="tr-input sm:w-52" defaultValue="" onChange={(event) => event.target.value && addButton(event.target.value as HostedPageEditorButton["type"])}>
              <option value="" disabled>
                Add link
              </option>
              {supportedHostedPageButtons.map((button) => (
                <option key={button.type} value={button.type}>
                  {button.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3">
            {orderedButtons.map((button, index) => (
              <div key={button.id} className="rounded-lg border border-line bg-soft p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input type="checkbox" checked={button.enabled} onChange={(event) => updateButton(button.id, { enabled: event.target.checked })} />
                    Enabled
                  </label>
                  <div className="flex gap-1">
                    <button type="button" aria-label="Move up" onClick={() => moveButton(button.id, -1)} disabled={index === 0} className="tr-icon-button">
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" aria-label="Move down" onClick={() => moveButton(button.id, 1)} disabled={index === orderedButtons.length - 1} className="tr-icon-button">
                      <ArrowDown size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
                  <label className="tr-field-label">
                    Label
                    <input className="tr-input" value={button.label} onChange={(event) => updateButton(button.id, { label: event.target.value })} />
                  </label>
                  <label className="tr-field-label">
                    Destination URL
                    <input className="tr-input" value={button.url} onChange={(event) => updateButton(button.id, { url: event.target.value })} placeholder="https://example.com" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tr-card grid gap-4 p-5">
          <div>
            <p className="tr-eyebrow">Appearance</p>
            <h2 className="tr-card-title mt-2">Page Style</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="tr-field-label">
              Style
              <select className="tr-input" value={draft.appearance.theme} onChange={(event) => updateDraft({ ...draft, appearance: { ...draft.appearance, theme: event.target.value as HostedPageEditorDraft["appearance"]["theme"] } })}>
                <option value="light">Light</option>
                <option value="warm">Warm</option>
                <option value="bold">Bold</option>
              </select>
            </label>
            <label className="tr-field-label">
              Accent
              <select className="tr-input" value={draft.appearance.accentColor} onChange={(event) => updateDraft({ ...draft, appearance: { ...draft.appearance, accentColor: event.target.value as HostedPageEditorDraft["appearance"]["accentColor"] } })}>
                <option value="#0f766e">Teal</option>
                <option value="#1d4ed8">Blue</option>
                <option value="#7c3aed">Violet</option>
                <option value="#be123c">Rose</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
        <div className="tr-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="tr-eyebrow">Preview</p>
              <h2 className="tr-card-title mt-1">Live page draft</h2>
            </div>
            <button type="button" onClick={() => refreshPreview()} className="tr-button-ghost text-sm">
              <Eye size={16} /> Refresh
            </button>
          </div>
          <iframe title="Hosted page draft preview" srcDoc={previewHtml} className="h-[640px] w-full rounded-md border border-line bg-white" />
        </div>
        <div className="tr-card grid gap-3 p-4">
          <p className="tr-eyebrow">Publish</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveDraft} disabled={status === "saving" || status === "publishing"} className="tr-button-secondary">
              <Save size={16} /> {status === "saving" ? "Saving..." : "Save Draft"}
            </button>
            <button type="button" onClick={publish} disabled={status === "publishing" || status === "saving"} className="tr-button-primary">
              <Check size={16} /> {status === "publishing" ? "Publishing..." : "Publish"}
            </button>
          </div>
          <p className="text-sm text-muted">
            {isDirty ? "Unsaved changes" : page.publishedAt ? `Published ${new Date(page.publishedAt).toLocaleString()}` : "Draft saved"}
          </p>
          {message ? <p className={status === "error" ? "tr-status-error" : "tr-status-success"}>{message}</p> : null}
        </div>
      </aside>
    </div>
  );
}
