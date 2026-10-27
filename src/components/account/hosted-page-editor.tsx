"use client";
import {HostedPageEditorToolbar,type EditorStatus} from './hosted-page-editor-toolbar';
import {HostedPagePreviewPanel} from './hosted-page-preview-panel';

import { hostedPageButtonLimit,supportedHostedPageButtons,type HostedPageEditorButton,type HostedPageEditorDraft,type HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";
import { useRouter } from "next/navigation";
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
    <fieldset disabled={status==="saving"||status==="publishing"} className="grid min-h-0 min-w-0 gap-3">
      <HostedPageEditorToolbar permanentUrl={permanentUrl} page={page} status={status} message={message} isDirty={isDirty} saveDraft={saveDraft} publish={publish}/>

      <div className="grid min-h-0 min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="grid min-h-0 content-start gap-3">
        <HostedPageBusinessFields draft={draft} updateDraft={updateDraft} uploadLogo={uploadLogo} />

        <HostedPageLinksFields draft={draft} orderedButtons={orderedButtons} showLinkChoices={showLinkChoices} setShowLinkChoices={setShowLinkChoices} addButton={addButton} updateButton={updateButton} moveButton={moveButton} removeButton={removeButton} />

        <HostedPageStyleFields draft={draft} updateDraft={updateDraft} />
        </section>

        <HostedPagePreviewPanel previewHtml={previewHtml} previewMessage={previewMessage} refreshPreview={refreshPreview}/>
      </div>
    </fieldset>
  );
}
