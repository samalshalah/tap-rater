"use client";

import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Check, Copy, ExternalLink, Eye, Plus, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { getHostedButtonMark, hostedPageButtonLimit, supportedHostedPageButtons, type HostedPageEditorButton, type HostedPageEditorDraft, type HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";

type EditorStatus = "idle" | "saving" | "saved" | "publishing" | "published" | "error";

export function HostedPageEditor({ initialPage }: { initialPage: HostedPageEditorRecord }) {
  const [page, setPage] = useState(initialPage);
  const [draft, setDraft] = useState<HostedPageEditorDraft>(initialPage.draft);
  const [previewHtml, setPreviewHtml] = useState("");
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [message, setMessage] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [showLinkChoices, setShowLinkChoices] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const previewRequestId = useRef(0);

  const permanentUrl = `https://taprater.com/p/${page.code}`;
  const orderedButtons = useMemo(() => [...draft.buttons].sort((a, b) => a.position - b.position), [draft.buttons]);
  const logoAlign = draft.appearance.logoAlign ?? "center";

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshPreview(draft);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [draft, page.code]);

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
          enabled: true,
          position: orderedButtons.length
        }
      ]
    });
    setShowLinkChoices(false);
  }

  function removeButton(id: string) {
    updateDraft({
      ...draft,
      buttons: orderedButtons.filter((button) => button.id !== id).map((button, position) => ({ ...button, position }))
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
    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;
    setPreviewMessage("");
    const response = await fetch("/api/account/hosted-page/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: page.code, draft: nextDraft })
    });
    const body = await response.json().catch(() => null);
    if (requestId !== previewRequestId.current) return;
    if (response.ok) {
      setPreviewHtml(body.html ?? "");
      return;
    }
    setPreviewMessage(body?.error ?? "Preview could not be generated yet.");
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
    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid gap-3">
        <div className="tr-card grid gap-2 p-3">
          <div>
            <p className="tr-eyebrow">Page information</p>
            <h2 className="tr-card-title mt-1">Business</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Business name
            <input className="tr-input min-h-10 px-3 py-2" value={draft.businessName} onChange={(event) => updateDraft({ ...draft, businessName: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Supporting text
            <input className="tr-input min-h-10 px-3 py-2" value={draft.description ?? ""} onChange={(event) => updateDraft({ ...draft, description: event.target.value })} />
          </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-[56px_1fr] sm:items-center">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
              {draft.logoUrl ? <img src={draft.logoUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-xs font-medium text-muted">Logo</span>}
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
              <label className="tr-button-secondary min-h-10 w-fit cursor-pointer px-3 py-2 text-sm">
                <Upload size={16} /> Upload logo
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} className="sr-only" />
              </label>
              <div className="inline-flex w-fit rounded-md border border-line bg-white p-1" aria-label="Logo alignment">
                {[
                  { value: "left", label: "Align logo left", icon: AlignLeft },
                  { value: "center", label: "Align logo center", icon: AlignCenter },
                  { value: "right", label: "Align logo right", icon: AlignRight }
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-label={option.label}
                      className={logoAlign === option.value ? "grid h-8 w-8 place-items-center rounded bg-ink text-white" : "grid h-8 w-8 place-items-center rounded text-muted hover:bg-soft hover:text-ink"}
                      onClick={() => updateDraft({ ...draft, appearance: { ...draft.appearance, logoAlign: option.value as "left" | "center" | "right" } })}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="tr-card grid gap-2 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="tr-eyebrow">Buttons / links</p>
              <h2 className="tr-card-title mt-1">Your Links</h2>
            </div>
            <button
              type="button"
              className="tr-button-secondary min-h-10 w-full justify-center px-3 py-2 text-sm sm:w-fit"
              onClick={() => setShowLinkChoices((value) => !value)}
              disabled={draft.buttons.length >= hostedPageButtonLimit}
            >
              <Plus size={16} />
              Add link
            </button>
          </div>
          {showLinkChoices && draft.buttons.length < hostedPageButtonLimit ? (
            <div className="grid gap-2 rounded-lg border border-line bg-soft p-2 sm:grid-cols-2 lg:grid-cols-5">
              {supportedHostedPageButtons.map((button) => (
                <button key={button.type} type="button" className="tr-button-ghost min-h-9 justify-start bg-white px-2 py-1.5 text-xs" onClick={() => addButton(button.type)}>
                  <HostedButtonMark type={button.type} />
                  {button.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2">
            {orderedButtons.map((button, index) => (
              <div key={button.id} className="grid gap-2 rounded-lg border border-line bg-soft p-2 md:grid-cols-[170px_minmax(0,1fr)_auto] md:items-end">
                  <label className="grid gap-1.5 text-sm font-medium text-ink">
                    Label
                    <div className="flex items-center gap-2">
                      <HostedButtonMark type={button.type} />
                      <input className="tr-input min-h-10 px-3 py-2" value={button.label} onChange={(event) => updateButton(button.id, { label: event.target.value })} />
                    </div>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-ink">
                    Destination URL
                    <input className="tr-input min-h-10 px-3 py-2" value={button.url} onChange={(event) => updateButton(button.id, { url: event.target.value })} placeholder="https://example.com" />
                  </label>
                  <div className="flex gap-1">
                    <button type="button" aria-label="Move up" onClick={() => moveButton(button.id, -1)} disabled={index === 0} className="tr-icon-button">
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" aria-label="Move down" onClick={() => moveButton(button.id, 1)} disabled={index === orderedButtons.length - 1} className="tr-icon-button">
                      <ArrowDown size={16} />
                    </button>
                    <button type="button" aria-label="Remove link" onClick={() => removeButton(button.id)} className="tr-icon-button">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
            ))}
          </div>
        </div>

        <div className="tr-card grid gap-2 p-3">
          <div>
            <p className="tr-eyebrow">Appearance</p>
            <h2 className="tr-card-title mt-1">Page Style</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Style
              <select className="tr-input min-h-10 px-3 py-2" value={draft.appearance.theme} onChange={(event) => updateDraft({ ...draft, appearance: { ...draft.appearance, theme: event.target.value as HostedPageEditorDraft["appearance"]["theme"] } })}>
                <option value="light">Light</option>
                <option value="warm">Warm</option>
                <option value="bold">Bold</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Accent
              <select className="tr-input min-h-10 px-3 py-2" value={draft.appearance.accentColor} onChange={(event) => updateDraft({ ...draft, appearance: { ...draft.appearance, accentColor: event.target.value as HostedPageEditorDraft["appearance"]["accentColor"] } })}>
                <option value="#0f766e">Teal</option>
                <option value="#1d4ed8">Blue</option>
                <option value="#7c3aed">Violet</option>
                <option value="#be123c">Rose</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <aside className="grid h-fit gap-3 lg:sticky lg:top-3">
        <div className="tr-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="tr-eyebrow">Preview</p>
              <h2 className="tr-card-title mt-1">Preview</h2>
            </div>
            <button type="button" onClick={() => refreshPreview()} className="tr-button-ghost min-h-9 px-2 py-1 text-xs">
              <Eye size={16} /> Refresh
            </button>
          </div>
          {previewMessage ? <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{previewMessage}</p> : null}
          <iframe title="Hosted page draft preview" srcDoc={previewHtml} className="h-[430px] max-h-[48vh] min-h-[330px] w-full rounded-md border border-line bg-white" />
        </div>
        <div className="tr-card grid gap-2 p-3">
          <p className="tr-eyebrow">Publish</p>
          <div className="min-w-0 rounded-md border border-line bg-soft px-3 py-2">
            <p className="text-xs text-muted">Permanent URL</p>
            <p className="mt-1 truncate text-sm font-medium text-ink">{permanentUrl}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => navigator.clipboard?.writeText(permanentUrl)} className="tr-button-ghost min-h-9 px-2 py-1 text-xs">
                <Copy size={14} /> Copy
              </button>
              <a href={permanentUrl} target="_blank" rel="noreferrer" className="tr-button-ghost min-h-9 px-2 py-1 text-xs">
                <ExternalLink size={14} /> Open
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveDraft} disabled={status === "saving" || status === "publishing"} className="tr-button-secondary min-h-10 px-3 py-2">
              <Save size={16} /> {status === "saving" ? "Saving..." : "Save Draft"}
            </button>
            <button type="button" onClick={publish} disabled={status === "publishing" || status === "saving"} className="tr-button-primary min-h-10 px-3 py-2">
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

function HostedButtonMark({ type }: { type: HostedPageEditorButton["type"] }) {
  const mark = getHostedButtonMark(type);
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-medium"
      style={{ backgroundColor: mark.background, borderColor: mark.border, color: mark.color }}
      aria-label={mark.brand}
    >
      {mark.text}
    </span>
  );
}
