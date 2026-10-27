"use client";
import type { HostedPageEditorDraft } from "@/lib/hosted-page-editor-shared";

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
        </div>);
}
