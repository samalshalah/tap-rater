"use client";
import type {GridSettings} from "@/lib/heatmap-data";
import type {DistanceUnit} from "@/lib/heatmap-distance";
import type {HeatmapTrack} from "@/lib/heatmap-data";
import type {FormEvent} from "react";
import {ModalDialog} from "@/components/ui/modal-dialog";
type Props = {
 track?: HeatmapTrack;
 busy: boolean;
 error: string;
 form: GridSettings;
 closeEditor: () => void;
 submit: (event: FormEvent) => Promise<void>;
 change: <K extends keyof GridSettings>(key: K, value: GridSettings[K]) => void;
 distance: (km: number) => string;
 distanceUnit: DistanceUnit;
 span: number;
 estimate: (settings: GridSettings) => number | null;
};
const field="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";
export function HeatmapKeywordEditor({track, busy, error, form, closeEditor, submit, change, distance, distanceUnit, span, estimate}: Props) {
 return <ModalDialog labelledBy="heatmap-keyword-title" onClose={closeEditor}><form onSubmit={submit} className="tr-listing-dialog tr-heatmap-keyword-dialog tr-heatmap-editor"><header><h2 id="heatmap-keyword-title" data-dialog-heading tabIndex={-1}>{track?'Edit tracking setup':'Add a keyword'}</h2><button type="button" disabled={busy} aria-label="Close keyword editor" onClick={closeEditor}>✕</button></header>{error&&<p role="alert" className="text-red-800">{error}</p>}<fieldset disabled={busy} className="tr-heatmap-editor-fields"><label className="block text-sm">Search keyword<input required minLength={2} maxLength={120} className={field} value={form.keyword} placeholder="e.g. women’s clothing store" onChange={e=>change('keyword',e.target.value)}/></label><label className="block text-sm">Grid size<select className={field} value={form.size} onChange={e=>change('size',Number(e.target.value) as GridSettings['size'])}><option value={3}>3 × 3 · 9 points</option><option value={5}>5 × 5 · 25 points</option><option value={7}>7 × 7 · 49 points</option></select></label><label className="block text-sm">Distance between points<select className={field} value={form.spacingKm} onChange={e=>change('spacingKm',Number(e.target.value) as GridSettings['spacingKm'])}>{[0.25,0.5,1,2].map(n=><option value={n} key={n}>{distance(n)} {distanceUnit}</option>)}</select></label><label className="block text-sm">Search language<select className={field} value={form.language} onChange={e=>change('language',e.target.value as GridSettings['language'])}><option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="ar">Arabic</option></select></label><p className="text-xs text-muted">Covers approximately {distance(span)} × {distance(span)} {distanceUnit} around the imported Google pin. {estimate(form)!==null?`Estimated scan cost: $${estimate(form)!.toFixed(4)} USD for ${form.size*form.size} points.`:'Request a quote after saving to see the scan estimate.'} Saving only updates tracking settings; a manual scan needs separate cost approval.</p><button className="tr-button-primary w-full" disabled={!form.keyword.trim()}>{busy?'Saving…':'Save tracking setup'}</button><button type="button" className="tr-button-ghost w-full" onClick={closeEditor}>Cancel</button></fieldset></form></ModalDialog>;
}
