"use client";
import type { HostedPageEditorButton,HostedPageEditorDraft } from "@/lib/hosted-page-editor-shared";
import { getHostedButtonMark,hostedPageButtonLimit,supportedHostedPageButtons } from "@/lib/hosted-page-editor-shared";
import { ArrowDown,ArrowUp,CalendarDays,Globe,LinkIcon,Mail,Menu,Plus,Trash2 } from "lucide-react";
import type { Dispatch,SetStateAction } from "react";

export function HostedPageLinksFields({draft, orderedButtons, showLinkChoices, setShowLinkChoices, addButton, updateButton, moveButton, removeButton}:{draft:HostedPageEditorDraft; orderedButtons:HostedPageEditorButton[]; showLinkChoices:boolean; setShowLinkChoices:Dispatch<SetStateAction<boolean>>; addButton:(type:HostedPageEditorButton["type"])=>void; updateButton:(id:string,patch:Partial<HostedPageEditorButton>)=>void; moveButton:(id:string,direction:-1|1)=>void; removeButton:(id:string)=>void;}){

return (<div className="tr-card grid gap-2 p-3">
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
        </div>);
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
