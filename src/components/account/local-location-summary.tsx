"use client";
import {businessOptimizationEnabled} from '@/lib/business-optimization-feature';
import {Building2,Search} from 'lucide-react';
import type {Location,Snapshot} from './local-dashboard-types';
import type {ListingStatus} from './local-dashboard-data';
type Props={tab:string;query:string;setQuery:(value:string)=>void;visible:Location[];data:Snapshot|null;listingStatus:Map<string,ListingStatus>;choose:(id:string)=>void;openTab:(tab:'reviews'|'listings',id:string)=>void};
export function LocalLocationSummary({tab,query,setQuery,visible,data,listingStatus,choose,openTab}:Props){return <>
    {tab==='performance'&&<div className="mb-3"><h2 className="text-lg font-semibold">Location report</h2><p className="mt-1 text-sm text-muted">Current saved totals, not a date-range report. Select a location for dated Google performance below.</p></div>}
    <label className="mb-3 flex max-w-md items-center gap-2 rounded-lg border border-line bg-white px-3"><Search size={16}/><input aria-label="Search locations" className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Search locations" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div role="list" aria-label="Location totals" className="grid gap-3">{visible.map(l=>{
 const status=listingStatus.get(l.id);const issues=status?.issues||0;
 const metrics=[['Reviews',l.synced_at?l.review_count:'—'],['Unanswered',l.synced_at?l.unanswered_count:'—'],['Drafts',l.draft_count]];
 return <article key={l.id} role="listitem" className="tr-stand-row tr-card tr-location-row p-4"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div className="flex min-w-0 items-center gap-3">
   <div className="tr-stand-thumbnail flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white p-1"><Building2 size={22} className="text-muted" aria-hidden="true"/></div>
   <div className="min-w-0">
    <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-medium text-ink">{l.business_name}</h3><span className={'tr-badge '+(l.last_error?'is-warning':l.connected?'is-success':'')}>{l.last_error?'Import needs attention':l.connected?'Connected':'Not connected'}</span></div>
    <p className="mt-1 truncate text-xs text-muted">{l.address||'Address not provided'}</p>
    <p className="mt-1 text-xs text-muted">{metrics.map(([label,value],i)=><span key={String(label)}>{i>0&&' · '}{label} <strong className="text-ink">{value}</strong></span>)} · Last import: {l.synced_at?new Date(l.synced_at).toLocaleString():'Never imported'}{businessOptimizationEnabled&&<> · Listings: {issues?`${issues} need attention`:status?.checked?'No recorded issues':'Not checked'}</>}</p>
    {l.last_error&&<details className="mt-2 text-xs text-red-700"><summary>Import details</summary>{l.last_error}</details>}
   </div>
  </div>
  <div className="flex shrink-0 flex-wrap items-center gap-2">{businessOptimizationEnabled&&<button className="tr-button-ghost" onClick={()=>{choose(l.id);openTab('listings',l.id);}}>Listings</button>}{tab==='performance'&&<button className="tr-button-ghost" onClick={()=>choose(l.id)}>Performance</button>}<button className="tr-button-primary" onClick={()=>{choose(l.id);openTab('reviews',l.id);}}>{!l.connected?'Connect Google':l.draft_count?'Review drafts':'Reviews'}</button></div>
 </div></article>;
 })}</div>{data&&!visible.length&&<p className="p-5 text-sm text-muted">{query?'No matching locations.':'No locations yet. Add a location to get started.'}</p>}{!data&&<p className="p-4 text-sm text-muted">Location totals will appear after loading.</p>}</>;}
