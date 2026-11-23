"use client";
import {HostedPageEditorToolbar,type EditorStatus} from './hosted-page-editor-toolbar';
import {HostedPagePreviewPanel} from './hosted-page-preview-panel';

import { hostedPageButtonLimit,supportedHostedPageButtons,type HostedPageEditorButton,type HostedPageEditorDraft,type HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";
import { useRouter } from "next/navigation";
import { Check, Eye, Save, X } from "lucide-react";
import { memo,useCallback,useEffect,useMemo,useState,type ChangeEvent } from "react";

import { HostedPageBusinessFields as HostedPageBusinessFieldsComponent } from "./hosted-page-business-fields";
import { HostedPageLinksFields as HostedPageLinksFieldsComponent } from "./hosted-page-links-fields";
import { HostedPageStyleFields as HostedPageStyleFieldsComponent } from "./hosted-page-style-fields";
import { useHostedPagePreview } from "./use-hosted-page-preview";



const HostedPageBusinessFields=memo(HostedPageBusinessFieldsComponent);

const HostedPageLinksFields=memo(HostedPageLinksFieldsComponent);

const HostedPageStyleFields=memo(HostedPageStyleFieldsComponent);

export function HostedPageEditor({ initialPage,onDirtyChange,onBusyChange }: { initialPage: HostedPageEditorRecord;onDirtyChange?:(dirty:boolean)=>void;onBusyChange?:(busy:boolean)=>void }) {
  const router=useRouter();
  const [page, setPage] = useState(initialPage);
  const [draft, setDraft] = useState<HostedPageEditorDraft>(initialPage.draft);
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [message, setMessage] = useState("");
  const [showLinkChoices, setShowLinkChoices] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const {previewHtml,previewMessage,refreshPreview}=useHostedPagePreview(page,draft);

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


  const updateDraft=useCallback((next: HostedPageEditorDraft)=>{
    setDraft(next);
    setIsDirty(true);
    setStatus("idle");
    setMessage("");
  },[]);

  const updateButton=useCallback((id: string, patch: Partial<HostedPageEditorButton>)=>{
    updateDraft({
      ...draft,
      buttons: draft.buttons.map((button) => (button.id === id ? { ...button, ...patch } : button))
    });
  },[draft,updateDraft]);

  const moveButton=useCallback((id: string, direction: -1 | 1)=>{
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
  },[draft,orderedButtons,updateDraft]);

  const addButton=useCallback((type: HostedPageEditorButton["type"])=>{
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
  },[draft,orderedButtons,updateDraft]);

  const removeButton=useCallback((id: string)=>{
    updateDraft({
      ...draft,
      buttons: orderedButtons.filter((button) => button.id !== id).map((button, position) => ({ ...button, position }))
    });
  },[draft,orderedButtons,updateDraft]);

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

  const uploadLogo=useCallback(async (event: ChangeEvent<HTMLInputElement>)=>{
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
  },[draft,updateDraft]);

  return (
    <fieldset disabled={status==="saving"||status==="publishing"} className="tr-multilink-editor grid min-h-0 min-w-0 gap-3">
      <HostedPageEditorToolbar permanentUrl={permanentUrl} page={page} status={status} message={message} isDirty={isDirty} saveDraft={saveDraft} publish={publish}/>

      <div className="grid min-h-0 min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="grid min-h-0 content-start gap-3">
        <HostedPageBusinessFields draft={draft} updateDraft={updateDraft} uploadLogo={uploadLogo} />

        <HostedPageLinksFields draft={draft} orderedButtons={orderedButtons} showLinkChoices={showLinkChoices} setShowLinkChoices={setShowLinkChoices} addButton={addButton} updateButton={updateButton} moveButton={moveButton} removeButton={removeButton} />

        <HostedPageStyleFields draft={draft} updateDraft={updateDraft} />
        </section>

        <HostedPagePreviewPanel previewHtml={previewHtml} previewMessage={previewMessage} refreshPreview={refreshPreview}/>
      </div>

      {/* Phones: keep Preview and Publish in reach while editing further down the page. */}
      <div className="sticky -bottom-3 z-10 -mx-3 -mb-3 grid gap-1.5 border-t border-line bg-white px-3 py-2 shadow-[0_-4px_12px_rgba(15,23,42,0.08)] lg:hidden">
        {message || isDirty ? <p className={`truncate text-xs ${status === "error" ? "text-red-700" : "text-muted"}`}>{message || "Unsaved changes"}</p> : null}
        <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-2">
          <button type="button" onClick={() => { setPreviewOpen(true); void refreshPreview(); }} className="tr-button-ghost min-h-11 px-3 text-sm"><Eye size={16} /> Preview</button>
          <button type="button" onClick={saveDraft} disabled={status === "saving" || status === "publishing"} className="tr-button-ghost min-h-11 px-3 text-sm"><Save size={16} /> {status === "saving" ? "Saving..." : "Save draft"}</button>
          <button type="button" onClick={publish} disabled={status === "publishing" || status === "saving"} className="tr-button-primary min-h-11 px-3 text-sm"><Check size={16} /> {status === "publishing" ? "Publishing..." : "Publish"}</button>
        </div>
      </div>

      {previewOpen ? (
        <div role="dialog" aria-modal="true" aria-label="Page preview" className="fixed inset-0 z-[80] flex flex-col bg-soft lg:hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-white px-3 py-2">
            <p className="text-sm font-semibold text-ink">Preview</p>
            <button type="button" onClick={() => setPreviewOpen(false)} className="tr-button-ghost min-h-11 px-3 text-sm" autoFocus><X size={16} /> Close</button>
          </div>
          {previewMessage ? <p className="mx-3 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{previewMessage}</p> : null}
          <iframe title="Page preview" srcDoc={previewHtml} className="min-h-0 w-full flex-1 border-0 bg-white" />
          <div className="border-t border-line bg-white p-2">
            <button type="button" onClick={() => { setPreviewOpen(false); void publish(); }} disabled={status === "publishing" || status === "saving"} className="tr-button-primary min-h-11 w-full text-sm"><Check size={16} /> Publish</button>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
