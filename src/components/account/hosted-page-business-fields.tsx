"use client";
import type { HostedPageEditorDraft } from "@/lib/hosted-page-editor-shared";
import { AlignCenter,AlignLeft,AlignRight,Upload } from "lucide-react";
import type { ChangeEvent } from "react";

export function HostedPageBusinessFields({draft, updateDraft, uploadLogo}:{draft: HostedPageEditorDraft; updateDraft:(draft:HostedPageEditorDraft)=>void; uploadLogo:(event:ChangeEvent<HTMLInputElement>)=>void;}){
const logoAlign=draft.appearance.logoAlign??"center"; const textAlign=draft.appearance.textAlign??"center";
return (<div className="tr-card grid gap-2 p-3">
          <div>
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
        </div>);
}
