"use client";
import { WorkspaceDetails } from './workspace-details';

import { hostedPageButtonLimit,supportedHostedPageButtons,type HostedPageEditorButton,type HostedPageEditorDraft,type HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";
import { Check,Copy,ExternalLink,Eye,Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect,useMemo,useState,type ChangeEvent } from "react";

import { HostedPageBusinessFields } from "./hosted-page-business-fields";
import { HostedPageLinksFields } from "./hosted-page-links-fields";
import { HostedPageStyleFields } from "./hosted-page-style-fields";
import { useHostedPagePreview } from "./use-hosted-page-preview";

type EditorStatus = "idle" | "saving" | "saved" | "publishing" | "published" | "error";

export function HostedPageEditor({ initialPage,onDirtyChange,onBusyChange }: { initialPage: HostedPageEditorRecord;onDirtyChange?:(dirty:boolean)=>void;onBusyChange?:(busy:boolean)=>void }) {
  const router=useRouter();
  const [page, setPage] = useState(initialPage);
  const [draft, setDraft] = useState<HostedPageEditorDraft>(initialPage.draft);
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [message, setMessage] = useState("");
  const [showLinkChoices, setShowLinkChoices] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const {previewHtml,previewMessage,refreshPreview}=useHostedPagePreview(page.code,draft);

  useEffect(()=>{onDirtyChange?.(isDirty);},[isDirty,onDirtyChange]);
  useEffect(()=>{onBusyChange?.(status==="saving"||status==="publishing");},[status,onBusyChange]);
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
    try {
    const response = await fetch("/api/account/hosted-page/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: page.code, draft,version:page.draftVersion??0 })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 409) router.refresh();
      setStatus("error");
      setMessage(body?.error ?? "Draft could not be saved.");
      return false;
    }

    setPage(body.page);
    setDraft(body.page.draft);
    setStatus("saved");
    setMessage("Draft saved. Your live page has not changed.");
    setIsDirty(false);
    router.refresh();
    return body.page as HostedPageEditorRecord;
    }catch{setStatus("error");setMessage("Connection interrupted. Your edits are still here. Try saving again.");return false;}
  }

  async function publish() {
    try{
    let version=page.draftVersion??0;
    setStatus("publishing");
    setMessage("");
    if (isDirty) {
      const saved = await saveDraft();
      if (!saved) return;
      version=saved.draftVersion??0;
      setStatus("publishing");
    }

    const response = await fetch("/api/account/hosted-page/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: page.code,version })
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
    }catch{setStatus("error");setMessage("The request could not be confirmed. Refresh before trying again.");}
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
    <fieldset disabled={status==="saving"||status==="publishing"} className="grid min-h-0 min-w-0 gap-3">
      <div className="tr-card grid gap-2 p-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0"><WorkspaceDetails label="Page URL & publishing" title="Page URL & publishing"><p className="break-all">{permanentUrl}</p><p>{page.publishedAt?`Last published ${new Date(page.publishedAt).toLocaleString()}`:'Not published yet'}</p><p>Save Draft keeps edits private. Publish updates this permanent page address.</p></WorkspaceDetails></div>
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
        <section className="grid min-h-0 content-start gap-3">
        <HostedPageBusinessFields draft={draft} updateDraft={updateDraft} uploadLogo={uploadLogo} />

        <HostedPageLinksFields draft={draft} orderedButtons={orderedButtons} showLinkChoices={showLinkChoices} setShowLinkChoices={setShowLinkChoices} addButton={addButton} updateButton={updateButton} moveButton={moveButton} removeButton={removeButton} />

        <HostedPageStyleFields draft={draft} updateDraft={updateDraft} />
        </section>

        <aside className="grid h-fit gap-3 lg:sticky lg:top-3">
        <div className="tr-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
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
    </fieldset>
  );
}
