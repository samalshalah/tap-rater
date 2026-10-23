'use client';
import {useState} from 'react';
import {compareCompetitors,type CompetitorPoint} from '@/lib/heatmap-competitors';

export function HeatmapCompetitors({points,trackId,target,size,busy,onRecover,hasScan}:{points:CompetitorPoint[];trackId:string;target:{placeId:string;title:string};size:number;busy:boolean;onRecover:()=>void;hasScan:boolean}){
 const comparison=compareCompetitors(points,trackId,target,size);
 const [chosen,setChosen]=useState(target.placeId);
 const selected=comparison.rows.find(r=>r.placeId===chosen)||comparison.rows[0];
 const missing=points.some(p=>p.trackId===trackId&&p.state==='complete'&&!Array.isArray(p.competitors));
 return <section className="rounded-xl border border-line bg-white p-3 space-y-3" aria-label="Competitor comparison">
  <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Competitor comparison</h2><span className="text-xs text-muted">{comparison.captured}/{size*size} points captured · Same keyword, area and scan</span></header>
  {missing&&<div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span>Load competitors from this saved scan. Provider cost: $0. No new scan.</span><button disabled={busy} className="tr-button-ghost" onClick={onRecover}>{busy?'Loading…':'Load saved competitors'}</button></div>}
  {!comparison.captured?<p className="text-sm text-muted">{hasScan?'Competitors have not been captured for these completed points yet.':'No matching scan. Review the scan cost above before approving a new scan.'}</p>:<>
   <div className="flex flex-wrap items-center gap-5 rounded-lg bg-slate-50 p-3">
    <div className="min-w-48 flex-1"><strong>{selected.title}{selected.you?' · You':''}</strong><p className="text-xs text-muted mt-1">{selected.address||'Address unavailable in this scan'}</p><p className="text-sm mt-2">Found at {selected.found}/{comparison.captured} captured points · Average rank {selected.average?.toFixed(2)??'—'}</p><p className="text-xs text-muted mt-2">Select a business below to compare its grid. N ↑ · Hover a point for its result.</p></div>
    <div className="grid gap-1" style={{gridTemplateColumns:`repeat(${size},28px)`}} aria-label={`${selected.title} ranking grid`}>{selected.ranks.map((rank,i)=><span key={i} tabIndex={0} title={`Point ${i+1}: ${rank===undefined?'Not captured':rank===null?'Not found in top 20':`Rank ${rank}`}`} aria-label={`Point ${i+1}: ${rank===undefined?'Not captured':rank===null?'Not found in top 20':`Rank ${rank}`}`} className="flex h-7 items-center justify-center rounded-full text-xs font-semibold text-white" style={{background:rank===undefined?'#64748b':rank===null?'#dc2626':rank<=3?'#047857':rank<=10?'#ca8a04':'#ea580c'}}>{rank===undefined?'—':rank??'×'}</span>)}</div>
   </div>
   <p className="text-xs text-muted">Green 1–3 · Yellow 4–10 · Orange 11–20 · Red not found · Gray not captured. Ads excluded.</p>
   <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-line bg-slate-50 text-xs text-muted"><tr><th className="p-2">Business</th><th className="p-2">Rating / reviews</th><th className="p-2" title="Points where this business appeared in the organic top 20, divided by captured points.">Found ⓘ</th><th className="p-2" title="Average rank at points where found. Missing and unranked points are excluded.">Avg. rank ⓘ</th><th className="p-2" title="Percentage of captured points where this business ranks 1–3. This is grid coverage, not market share.">Top 3 coverage ⓘ</th></tr></thead><tbody>{comparison.rows.map(row=><tr key={row.placeId} className={`border-b border-line ${row.placeId===selected.placeId?'bg-teal-50':''}`}><td className="p-2"><button className="text-left font-medium text-teal-800" aria-pressed={row.placeId===selected.placeId} onClick={()=>setChosen(row.placeId)}>{row.title}{row.you?' · You':''}</button><p className="max-w-80 truncate text-xs text-muted" title={row.address||''}>{row.address}</p></td><td className="p-2 whitespace-nowrap">{row.rating===null?'—':`${row.rating} ★`} / {row.reviews?.toLocaleString()??'—'}</td><td className="p-2">{row.found}/{comparison.captured}</td><td className="p-2">{row.average?.toFixed(2)??'—'}</td><td className="p-2">{row.top3?.toFixed(1)??'—'}%</td></tr>)}</tbody></table></div>
   <p className="text-xs text-muted">Ratings and review counts are snapshots from the saved scan. A dash means unavailable. Partial captures exclude missing points from every comparison.</p>
  </>}
 </section>;
}
