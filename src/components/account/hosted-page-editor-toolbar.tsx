"use client";
import {WorkspaceDetails} from './workspace-details';
import {Check,Copy,ExternalLink,Save} from 'lucide-react';
import type {HostedPageEditorRecord} from '@/lib/hosted-page-editor-shared';
export type EditorStatus="idle"|"saving"|"saved"|"publishing"|"published"|"error";
type Props={permanentUrl:string;page:HostedPageEditorRecord;status:EditorStatus;message:string;isDirty:boolean;saveDraft:()=>Promise<HostedPageEditorRecord|false>;publish:()=>Promise<void>};
export function HostedPageEditorToolbar({permanentUrl,page,status,message,isDirty,saveDraft,publish}:Props){return <div className="tr-card grid gap-2 p-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
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
      </div>;}
