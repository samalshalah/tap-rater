"use client";
import type { HostedPageEditorButton,HostedPageEditorDraft } from "@/lib/hosted-page-editor-shared";
import { getHostedButtonMark,hostedPageButtonLimit,supportedHostedPageButtons } from "@/lib/hosted-page-editor-shared";
import { ArrowDown,ArrowUp,CalendarDays,ChevronDown,ExternalLink,Globe,LinkIcon,Mail,Menu,Plus,Search,Trash2 } from "lucide-react";
import { GoogleReviewLinkFinder } from "./google-review-link-finder";

// Sites with no lookup we can call: open a Google search for the business on that site instead.
const profileSearchSites: Partial<Record<HostedPageEditorButton["type"], string>> = {
  yelp: "yelp.com", dealerrater: "dealerrater.com", cars_com: "cars.com", cargurus: "cargurus.com", edmunds: "edmunds.com",
  autotrader: "autotrader.com", carfax: "carfax.com", bbb: "bbb.org", facebook: "facebook.com", instagram: "instagram.com",
  youtube: "youtube.com", tiktok: "tiktok.com", x: "x.com", linkedin: "linkedin.com"
};
import { useState,type Dispatch,type SetStateAction } from "react";

export function HostedPageLinksFields({draft, orderedButtons, showLinkChoices, setShowLinkChoices, addButton, updateButton, moveButton, removeButton}:{draft:HostedPageEditorDraft; orderedButtons:HostedPageEditorButton[]; showLinkChoices:boolean; setShowLinkChoices:Dispatch<SetStateAction<boolean>>; addButton:(type:HostedPageEditorButton["type"])=>void; updateButton:(id:string,patch:Partial<HostedPageEditorButton>)=>void; moveButton:(id:string,direction:-1|1)=>void; removeButton:(id:string)=>void;}){

const [logoPickerFor,setLogoPickerFor]=useState<string|null>(null);
const [findGoogleFor,setFindGoogleFor]=useState<string|null>(null);
const businessQuery=draft.businessName.trim();
const missingUrls=draft.buttons.filter((button)=>!button.url.trim()).length;
const labelFor=(type:HostedPageEditorButton["type"])=>supportedHostedPageButtons.find((item)=>item.type===type)?.label??"Custom Link";
const changeLogo=(button:HostedPageEditorButton,type:HostedPageEditorButton["type"])=>{
  // Keep a custom button label; replace it only when it still matches the old default.
  const label=!button.label.trim()||button.label.trim()===labelFor(button.type)?labelFor(type):button.label;
  updateButton(button.id,{type,label});
  setLogoPickerFor(null);
};
return (<div className="tr-card grid gap-2 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="tr-eyebrow">Buttons / links</p>
              <h2 className="tr-card-title mt-1">Your Links</h2>
              <p className="mt-1 text-xs text-muted">Add 1 to {hostedPageButtonLimit} links. One link with a web address is enough to publish.</p>
              {missingUrls>0?<p className="mt-1 text-xs text-amber-800">{missingUrls} of {draft.buttons.length} link{draft.buttons.length===1?"":"s"} need{missingUrls===1?"s":""} a web address. Links without one stay hidden on your page.</p>:null}
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
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-line bg-soft p-2 sm:grid-cols-3 lg:grid-cols-5">
              {supportedHostedPageButtons.map((button) => (
                <button key={button.type} type="button" className="tr-button-ghost min-h-9 justify-start gap-2 bg-white px-2 py-1.5 text-xs" onClick={() => addButton(button.type)}>
                  <HostedButtonMark type={button.type} />
                  <span className="truncate">{button.label}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid gap-1.5">
            {orderedButtons.map((button, index) => (
              <div key={button.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-lg border border-line bg-soft p-2 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <button type="button" aria-label={`Change logo for ${button.label || labelFor(button.type)}`} aria-expanded={logoPickerFor===button.id} onClick={() => setLogoPickerFor((current) => current===button.id ? null : button.id)} className="flex min-h-10 shrink-0 items-center gap-0.5 rounded-md border border-line bg-white px-1 hover:border-ink">
                        <HostedButtonMark type={button.type} />
                        <ChevronDown size={14} aria-hidden="true" />
                      </button>
                      {/* Branded links use the brand name automatically; only generic links need a name. */}
                      {getHostedButtonMark(button.type).logo ? null : <input aria-label="Link name" placeholder="Button name" className="tr-input min-h-9 w-40 min-w-0 px-3 py-1.5 text-sm md:w-44" value={button.label} onChange={(event) => updateButton(button.id, { label: event.target.value })} />}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 gap-1.5">
                    <input aria-label={`${button.label || labelFor(button.type)} web address`} className={`tr-input min-h-9 min-w-0 flex-1 px-3 py-1.5 text-sm ${button.url.trim()?"":"border-amber-400 bg-amber-50"}`} value={button.url} onChange={(event) => updateButton(button.id, { url: event.target.value })} placeholder="Add web address (https://…)" aria-describedby={button.url.trim()?undefined:`url-missing-${button.id}`} />
                    {button.type === "google_review" ? (
                      <button type="button" className="tr-button-ghost min-h-9 shrink-0 px-2.5 text-xs" aria-expanded={findGoogleFor===button.id} onClick={() => setFindGoogleFor((current) => current===button.id ? null : button.id)}><Search size={14} aria-hidden="true" />Find on Google</button>
                    ) : profileSearchSites[button.type] && businessQuery ? (
                      <a className="tr-button-ghost min-h-9 shrink-0 px-2.5 text-xs" target="_blank" rel="noopener noreferrer" title={`Search Google for ${businessQuery} on ${profileSearchSites[button.type]}`} href={`https://www.google.com/search?q=${encodeURIComponent(`"${businessQuery}" site:${profileSearchSites[button.type]}`)}`}><ExternalLink size={14} aria-hidden="true" />Find</a>
                    ) : null}
                    </div>
                    {button.url.trim()?null:<span id={`url-missing-${button.id}`} className="mt-1 block text-xs text-amber-800">Hidden until you add a web address</span>}
                  </div>
                  <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
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
                  {findGoogleFor===button.id ? <GoogleReviewLinkFinder initialQuery={businessQuery} onPick={(url) => updateButton(button.id, { url })} onClose={() => setFindGoogleFor(null)} /> : null}
                  {logoPickerFor===button.id ? (
                    <div role="listbox" aria-label="Choose a logo" className="grid grid-cols-2 gap-1.5 rounded-lg border border-line bg-white p-2 col-span-2 sm:grid-cols-3 md:col-span-3 lg:grid-cols-5">
                      {supportedHostedPageButtons.map((choice) => (
                        <button key={choice.type} type="button" role="option" aria-selected={choice.type===button.type} className={`tr-button-ghost min-h-9 justify-start gap-2 px-2 py-1.5 text-xs ${choice.type===button.type ? "bg-soft ring-2 ring-ink" : "bg-white"}`} onClick={() => changeLogo(button, choice.type)}>
                          <HostedButtonMark type={choice.type} />
                          <span className="truncate">{choice.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
            ))}
          </div>
        </div>);
}
function HostedButtonMark({ type }: { type: HostedPageEditorButton["type"] }) {
  const mark = getHostedButtonMark(type);
  if (mark.logo) {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-white" aria-label={mark.brand}>
        <img src={mark.logo} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md border"
      style={{ backgroundColor: mark.background, borderColor: mark.border, color: mark.color }}
      aria-label={mark.brand}
    >
      <HostedButtonIcon icon={mark.icon} text={mark.text} />
    </span>
  );
}

function HostedButtonIcon({ icon, text }: { icon: string; text: string }) {
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
  if (icon === "youtube") return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M9.5 7.5v9l7-4.5-7-4.5Z" fill="currentColor" /></svg>;
  if (icon === "tiktok") return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M14 4v10.2a3.2 3.2 0 1 1-3.2-3.2M14 4c.4 2.3 1.9 3.8 4.2 4.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (icon === "text") return <span className="text-[9px] font-bold leading-none">{text}</span>;
  if (icon === "website") return <Globe size={15} />;
  if (icon === "calendar") return <CalendarDays size={15} />;
  if (icon === "menu") return <Menu size={15} />;
  if (icon === "contact") return <Mail size={15} />;
  return <LinkIcon size={15} />;
}
