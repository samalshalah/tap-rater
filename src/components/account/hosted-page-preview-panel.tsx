"use client";
import {Eye} from 'lucide-react';
type Props={previewHtml:string;previewMessage:string;refreshPreview:()=>Promise<void>};
export function HostedPagePreviewPanel({previewHtml,previewMessage,refreshPreview}:Props){return <aside className="grid h-fit gap-3 lg:sticky lg:top-3">
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
        </aside>;}
