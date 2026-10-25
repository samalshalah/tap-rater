'use client';
import {WorkspaceDetails} from './workspace-details';
import {type ReviewAutomation} from './review-automation-controls';
import {useState} from 'react';
import {WorkspaceMetrics} from './workspace-ui';
import {ArrowUpRight,Info,Sparkles} from 'lucide-react';
export type OverviewLocation=ReviewAutomation&{id:string;business_name:string;connected:boolean;review_count:number;unanswered_count:number;draft_count:number;ai_consent?:boolean;auto_style?:string;rating_summary?:{sum:number;count:number};review_growth?:{month:string;rating:string;count:number}[]};
const ratings=['FIVE','FOUR','THREE','TWO','ONE','STAR_RATING_UNSPECIFIED'];
const colors=['#16a34a','#4ade80','#facc15','#fb923c','#ef4444','#cbd5e1'];
export function summarizeOverview(locations:OverviewLocation[],now=new Date()){
 const months=Array.from({length:12},(_,i)=>{const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-11+i,1));return {key:date.toISOString().slice(0,7),label:date.toLocaleDateString('en-US',{month:'short',timeZone:'UTC'}),counts:Array(6).fill(0) as number[]};});
 let sum=0,count=0;
 for(const l of locations){sum+=Number(l.rating_summary?.sum||0);count+=Number(l.rating_summary?.count||0);for(const r of l.review_growth||[]){const month=months.find(m=>m.key===r.month);if(month)month.counts[Math.max(0,ratings.includes(r.rating)?ratings.indexOf(r.rating):5)]+=Number(r.count);}}
 return {months,average:count?sum/count:null,total:locations.reduce((n,l)=>n+Number(l.review_count||0),0),unanswered:locations.reduce((n,l)=>n+Number(l.unanswered_count||0),0),drafts:locations.reduce((n,l)=>n+Number(l.draft_count||0),0)};
}
export function ReviewOverview({locations,onReviews,onProfile,onIssues,onSaved}:{onSaved:()=>Promise<void>;locations:OverviewLocation[];onReviews:()=>void;onProfile:()=>void;onIssues:()=>void}){
 const [range,setRange]=useState(12);
 const summary=summarizeOverview(locations),months=summary.months.slice(-range),max=Math.max(1,...months.map(m=>m.counts.reduce((a,b)=>a+b,0))),auto=locations.filter(l=>l.ai_consent&&l.connected).length;
 const panel='rounded-lg border border-line bg-white overflow-hidden';
 return <div className="tr-review-overview space-y-3" aria-label="Review overview">
 <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>{locations.length===1?(locations[0].connected?'● Google connected':'Google not connected'):`${locations.filter(l=>l.connected).length} of ${locations.length} locations connected`}</span><button onClick={onReviews} className="inline-flex items-center gap-1 text-teal-700">View reviews <ArrowUpRight size={14}/></button></div>
 <WorkspaceMetrics items={[{label:"Total reviews",value:summary.total.toLocaleString()},{label:"Average rating",value:summary.average===null?"—":summary.average.toFixed(1),note:"Out of 5 stars"},{label:"Unanswered reviews",value:summary.unanswered},{label:"Saved drafts",value:summary.drafts}]}/>
 <div className="grid gap-3">
 <section className={panel}><header className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">Review growth</h2><select aria-label="Review growth period" className="rounded border border-line px-2 py-1 text-xs" value={range} onChange={e=>setRange(Number(e.target.value))}><option value={12}>Last 12 months</option><option value={6}>Last 6 months</option><option value={3}>Last 3 months</option></select></header>
 <div className="p-4"><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">{colors.map((color,i)=><span key={color} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:color}}/>{i<5?`${5-i} star`:'No rating'}</span>)}<span title="Reviews grouped by their original posting month, using currently available imported reviews. This is not the date they were imported." tabIndex={0}><Info size={13}/><span className="sr-only">Grouped by posting month from available imported reviews</span></span></div>
 <div className="mt-5 flex h-44 items-end gap-2 border-b border-line" aria-label="Monthly review counts">{months.map(m=>{const total=m.counts.reduce((a,b)=>a+b,0);return <div key={m.key} className="flex h-full min-w-0 flex-1 flex-col justify-end items-center" title={`${m.key}: ${total} reviews`}><span className="mb-1 text-[11px] text-muted">{total}</span><div className="flex w-full max-w-8 flex-col-reverse" style={{height:`${total/max*85}%`}}>{m.counts.map((n,i)=>n>0&&<div key={i} style={{height:`${n/total*100}%`,background:colors[i]}}/>)}</div></div>;})}</div><div className="mt-2 flex gap-2 text-center text-[11px] text-muted">{months.map(m=><span key={m.key} className="min-w-0 flex-1">{m.label}</span>)}</div>
 <WorkspaceDetails label="View chart data" title="Monthly review counts"><div className="overflow-x-auto"><table className="mt-2 w-full text-right"><thead><tr><th className="text-left">Month</th>{ratings.map((r,i)=><th key={r}>{i<5?`${5-i}★`:'Unrated'}</th>)}</tr></thead><tbody>{months.map(m=><tr key={m.key}><th className="text-left font-normal">{m.key}</th>{m.counts.map((n,i)=><td key={i}>{n}</td>)}</tr>)}</tbody></table></div></WorkspaceDetails></div></section>
 </div>
 <section className="tr-overview-reply-toolbar"><h2 className="flex items-center gap-2"><Sparkles size={14}/>AI replies</h2><span className="text-xs text-muted">{locations.some(l=>l.auto_enabled)?'Autopilot on':'Autopilot off'}</span><button className="tr-button-ghost" onClick={onReviews}>Manage replies</button></section>

 </div>;
}
