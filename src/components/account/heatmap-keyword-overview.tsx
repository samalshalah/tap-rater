"use client";
import {Plus} from 'lucide-react';
import {useMemo} from 'react';
import type {HeatmapTrack} from '@/lib/heatmap-data';
import type {DistanceUnit} from '@/lib/heatmap-distance';
import {matchingScan} from '@/lib/heatmap-results';
import {summarizeKeyword} from '@/lib/heatmap-keyword-summary';
import {formatHeatmapScanDate} from '@/lib/heatmap-scan-date';
import {HeatmapInfo} from './heatmap-info';
import type {HeatmapSnapshot} from './location-heatmap-types';
export function HeatmapKeywordOverview({data,busy,dirty,distance,distanceUnit,choose,setView,onAdd}:{
 data:HeatmapSnapshot;busy:boolean;dirty:boolean;distance:(km:number)=>string;distanceUnit:DistanceUnit;
 choose:(track:HeatmapTrack)=>void;setView:(view:'heatmap'|'competitors'|'keywords')=>void;onAdd:()=>void;
}) {
 const summaries=useMemo(()=>data.tracks.map(t=>{const latest=matchingScan(data.scans,t,data.anchor);return {track:t,latest,summary:summarizeKeyword(latest?.points||[],t.id,latest?.anchor||data.anchor!,t.size)};}),[data]);
 return <div className="tr-keyword-overview"><div className="tr-keyword-toolbar"><span>{data.tracks.length} keywords</span><button className="tr-button-ghost" disabled={busy||dirty||data.tracks.length>=3} onClick={onAdd}><Plus size={16}/>Add keyword</button></div>{summaries.map(({track:t,latest,summary})=>{const bandLabels=['Top 3','Ranks 4–10','Ranks 11–20','Not found'];return <section key={t.id} className="tr-keyword-card" aria-label={`${t.keyword} summary`}><header><button disabled={busy||dirty} onClick={()=>{choose(t);setView('heatmap');}}>{t.keyword}</button><span>{latest?formatHeatmapScanDate(latest):'New scan required'} · {t.active?'Active':'Paused'}<HeatmapInfo label={t.keyword+' scan details'}>{t.size} × {t.size} grid · {distance(t.spacingKm)} {distanceUnit} spacing · {t.language} · {summary.completed}/{summary.total} points completed. Each keyword uses its latest saved scan matching this location and area.</HeatmapInfo></span></header><div className="tr-rank-metrics">{[
 ['Avg. rank',summary.average?.toFixed(2)??'—','Average rank where this business was found. Not-found and unfinished points are excluded.'],
 ['Share of voice',summary.shareOfVoice===null?'—':summary.shareOfVoice.toFixed(2)+'%',`Tap Rater estimate: 1 ÷ rank visibility weights, divided by all captured businesses’ total weight. Same calculation as Competitors. ${summary.voiceCaptured}/${summary.total} competitor captures. Missing captures are excluded; this is not traffic or market share.`],
 ...bandLabels.map((label,n)=>[label,summary.percentages[n]===null?'—':summary.percentages[n]!.toFixed(0)+'%',`${summary.bands[n]} of ${summary.completed} completed points. Unfinished points are excluded.`])
 ].map(([name,value,help])=><div key={name}><span>{name}<HeatmapInfo label={t.keyword+' '+name+' explanation'}>{help}</HeatmapInfo></span><strong>{value}</strong></div>)}</div><footer><div className="tr-keyword-distribution" role="img" aria-label={`${t.keyword}: ${summary.bands.map((count,n)=>`${bandLabels[n]} ${count}`).join(', ')}, ${summary.total-summary.completed} unfinished`}>{summary.completed?summary.percentages.map((pct,n)=><span key={n} style={{width:`${pct||0}%`,background:['#00a98d','#e8af00','#eb782b','#e63f4b'][n]}}/>):<span style={{width:'100%',background:'#dce5ef'}}/>}</div><span>{summary.completed}/{summary.total} completed{summary.completed>0&&summary.completed<summary.total?' · Partial scan':''}</span><button disabled={busy||dirty} onClick={()=>{choose(t);setView('competitors');}}>Compare competitors →</button></footer></section>})}{!data.tracks.length&&<p className="text-sm">Add a keyword to start tracking this location.</p>}</div>;
}
