"use client";

import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, CalendarDays, Check, Copy, ExternalLink, Eye, Globe, LinkIcon, Mail, Menu, Plus, Save, Trash2, Upload } from "lucide-react";
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
  const textAlign = draft.appearance.textAlign ?? "center";

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
    <div className="grid min-h-0 min-w-0 gap-3">
      <div className="tr-card grid gap-2 p-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs text-muted">Permanent URL</p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink">{permanentUrl}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => navigator.clipboard?.writeText(permanentUrl)} className="tr-button-ghost min-h-9 px-2 py-1 text-xs">
            <Copy size={14} /> Copy
          </button>
          <a href={permanentUrl} target="_blank" rel="noreferrer" className="tr-button-ghost min-h-9 px-2 py-1 text-xs">
            <ExternalLink size={14} /> Open
          </a>
          <button type="button" onClick={saveDraft} disabled={status === "saving" || status === "publishing"} className="tr-button-secondary min-h-9 px-3 py-1 text-xs">
            <Save size={14} /> {status === "saving" ? "Saving..." : "Save Draft"}
          </button>
          <button type="button" onClick={publish} disabled={status === "publishing" || status === "saving"} className="tr-button-primary min-h-9 px-3 py-1 text-xs">
            <Check size={14} /> {status === "publishing" ? "Publishing..." : "Publish"}
          </button>
        </div>
        <p className="text-xs text-muted lg:col-span-2">
          {message ? <span className={status === "error" ? "text-red-700" : "text-brand"}>{message}</span> : isDirty ? "Unsaved changes" : page.publishedAt ? `Published ${new Date(page.publishedAt).toLocaleString()}` : "Draft saved"}
        </p>
      </div>

      <div className="grid min-h-0 min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="grid min-h-0 gap-3">
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
              <div className="inline-grid w-fit gap-1">
                <span className="text-[11px] font-medium uppercase text-muted">Logo</span>
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
              <div className="inline-grid w-fit gap-1">
                <span className="text-[11px] font-medium uppercase text-muted">Text</span>
                <div className="inline-flex w-fit rounded-md border border-line bg-white p-1" aria-label="Text alignment">
                  {[
                    { value: "left", label: "Align text left", icon: AlignLeft },
                    { value: "center", label: "Align text center", icon: AlignCenter },
                    { value: "right", label: "Align text right", icon: AlignRight }
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-label={option.label}
                        className={textAlign === option.value ? "grid h-8 w-8 place-items-center rounded bg-ink text-white" : "grid h-8 w-8 place-items-center rounded text-muted hover:bg-soft hover:text-ink"}
                        onClick={() => updateDraft({ ...draft, appearance: { ...draft.appearance, textAlign: option.value as "left" | "center" | "right" } })}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>
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
            <div className="grid max-h-32 gap-1.5 overflow-y-auto rounded-lg border border-line bg-soft p-2 sm:grid-cols-2 lg:grid-cols-5">
              {supportedHostedPageButtons.map((button) => (
                <button key={button.type} type="button" className="tr-button-ghost min-h-9 justify-start gap-2 bg-white px-2 py-1.5 text-xs" onClick={() => addButton(button.type)}>
                  <HostedButtonMark type={button.type} />
                  <span className="truncate">{button.label}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid max-h-[260px] gap-1.5 overflow-y-auto pr-1">
            {orderedButtons.map((button, index) => (
              <div key={button.id} className="grid gap-2 rounded-lg border border-line bg-soft p-2 md:grid-cols-[minmax(0,210px)_minmax(0,1fr)_auto] md:items-center">
                  <label className="min-w-0">
                    <span className="sr-only">Link label</span>
                    <div className="flex min-w-0 items-center gap-2">
                      <HostedButtonMark type={button.type} />
                      <input className="tr-input min-h-9 min-w-0 px-3 py-1.5 text-sm" value={button.label} onChange={(event) => updateButton(button.id, { label: event.target.value })} />
                    </div>
                  </label>
                  <label className="min-w-0">
                    <span className="sr-only">Destination URL</span>
                    <input className="tr-input min-h-9 px-3 py-1.5 text-sm" value={button.url} onChange={(event) => updateButton(button.id, { url: event.target.value })} placeholder="https://example.com" />
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
                <option value="#e5e7eb">Light gray</option>
                <option value="#6b7280">Gray</option>
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
          <iframe title="Hosted page draft preview" srcDoc={previewHtml} className="h-[560px] max-h-[68vh] min-h-[430px] w-full rounded-md border border-line bg-white" />
        </div>
        </aside>
      </div>
    </div>
  );
}

function HostedButtonMark({ type }: { type: HostedPageEditorButton["type"] }) {
  const mark = getHostedButtonMark(type);
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border"
      style={{ backgroundColor: mark.background, borderColor: mark.border, color: mark.color }}
      aria-label={mark.brand}
    >
      <HostedButtonIcon icon={mark.icon} />
    </span>
  );
}

function HostedButtonIcon({ icon }: { icon: string }) {
  if (icon === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.44Z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.33l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.61 0-4.82-1.76-5.61-4.13H3.05v2.59A9.99 9.99 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.39 13.98A6 6 0 0 1 6.07 12c0-.69.12-1.36.32-1.98V7.43H3.05A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.05 4.57l3.34-2.59Z" />
        <path fill="#EA4335" d="M12 5.89c1.47 0 2.78.5 3.81 1.49l2.87-2.87C16.95 2.9 14.69 2 12 2a9.99 9.99 0 0 0-8.95 5.43l3.34 2.59C7.18 7.65 9.39 5.89 12 5.89Z" />
      </svg>
    );
  }

  if (icon === "yelp") return <span className="text-[10px] font-medium leading-none">yelp</span>;
  if (icon === "facebook") return <span className="font-serif text-lg font-medium leading-none">f</span>;
  if (icon === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16.5" cy="7.5" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (icon === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M12 4a7.7 7.7 0 0 0-6.6 11.7L4.7 20l4.4-1.1A7.8 7.8 0 1 0 12 4Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9.2 8.9c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.4.5c.6 1.1 1.4 1.9 2.6 2.5l.5-.6c.2-.2.4-.3.7-.2l1.6.7c.3.1.4.3.4.6v.4c0 .4-.2.7-.5.9-.4.2-.9.3-1.4.3-3.1-.2-6.9-3.8-7.1-7 0-.4.1-.9.4-1.3Z" fill="currentColor" />
      </svg>
    );
  }
  if (icon === "website") return <Globe size={15} />;
  if (icon === "calendar") return <CalendarDays size={15} />;
  if (icon === "menu") return <Menu size={15} />;
  if (icon === "contact") return <Mail size={15} />;
  return <LinkIcon size={15} />;
}
