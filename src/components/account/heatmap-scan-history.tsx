"use client";
import type {GridSettings} from "@/lib/heatmap-data";
import type {DistanceUnit} from "@/lib/heatmap-distance";
import {memo,useMemo} from "react";
import {formatHeatmapDistance} from "@/lib/heatmap-distance";
import {formatHeatmapScanDate} from "@/lib/heatmap-scan-date";
import {buildHeatmapScanHistory} from "@/lib/heatmap-scan-history";
import {HeatmapInfo} from "./heatmap-info";
import type {Scan} from "./location-heatmap-types";
type Props={scans:Scan[]; selected:string; settings:GridSettings; distanceUnit:DistanceUnit; editing:boolean; dirty:boolean; scanId:string; onChange:(id:string)=>void};
const field="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";
export const HeatmapScanHistory=memo(function HeatmapScanHistory({scans, selected, settings, distanceUnit, editing, dirty, scanId, onChange}:Props){
 const entries=useMemo(()=>buildHeatmapScanHistory(scans,selected),[scans,selected]);
 const distance=(km:number)=>formatHeatmapDistance(km,distanceUnit);
 const span=(settings.size-1)*settings.spacingKm;
 return <label className="tr-history-select">Scan <HeatmapInfo label="Scan history help">Choose a saved scan for this keyword. Dates show the actual submission time in New York time, not the weekly scheduling period. Latest matching settings only shows results for the currently saved area and grid. {settings.size} × {settings.size} grid · {distance(settings.spacingKm)} {distanceUnit} spacing · {distance(span)} × {distance(span)} {distanceUnit} area · {settings.language}.</HeatmapInfo><select aria-label="Scan history" className={field} disabled={editing||dirty} value={scanId} onChange={e=>onChange(e.target.value)}><option value="">Latest matching settings</option>{entries.map(({scan:s,settings:scanSettings,completed,total,needsAttention})=><option key={s.id} value={s.id}>{formatHeatmapScanDate(s,true)} · {scanSettings.size} × {scanSettings.size} · {distance(scanSettings.spacingKm)} {distanceUnit} spacing · {s.methodology==='maps-v2'?'':'Older scan · not comparable'} · {completed}/{total} points complete{needsAttention?' · Needs attention':''}</option>)}</select></label>;
});
