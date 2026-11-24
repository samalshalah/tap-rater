"use client";
import { hostedPageBrandColors, type HostedPageEditorDraft } from "@/lib/hosted-page-editor-shared";

export function HostedPageStyleFields({draft, updateDraft}:{draft:HostedPageEditorDraft; updateDraft:(draft:HostedPageEditorDraft)=>void;}){

return (<div className="tr-card grid gap-2 p-3">
          <div>
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
              Brand colour
              <select className="tr-input min-h-10 px-3 py-2" value={draft.appearance.accentColor} onChange={(event) => updateDraft({ ...draft, appearance: { ...draft.appearance, accentColor: event.target.value as HostedPageEditorDraft["appearance"]["accentColor"] } })}>
                {hostedPageBrandColors.some((color) => color.value === draft.appearance.accentColor) ? null : <option value={draft.appearance.accentColor}>Current colour</option>}
                {hostedPageBrandColors.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}
              </select>
              <span className="flex items-center gap-2 text-xs font-normal text-muted"><span aria-hidden="true" className="inline-block h-4 w-8 rounded border-[1.5px] bg-[#f4f5f7]" style={{ borderColor: draft.appearance.accentColor }} />Buttons are light gray with this colour as the outline.</span>
            </label>
          </div>
        </div>);
}
