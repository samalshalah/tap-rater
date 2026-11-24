"use client";
import {useEffect,useId,useState} from 'react';
import {X} from 'lucide-react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import type {HostedPageInsights,InsightRange} from '@/lib/hosted-page-insights';
import {supportedHostedPageButtons} from '@/lib/hosted-page-editor-shared';

const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const sourceLabel={nfc:'Tapped (NFC)',qr:'Scanned (QR)',direct:'Opened from the link'} as const;
const deviceLabel={ios:'iPhone',android:'Android',other:'Other'} as const;
const pct=(part:number,total:number)=>total?Math.round(part/total*100):0;
const hourLabel=(hour:number)=>`${hour%12||12}${hour<12?'am':'pm'}`;

function Bars({rows}:{rows:{label:string;value:number;note?:string}[]}){
  const max=Math.max(1,...rows.map(row=>row.value));
  return <ul className="grid gap-1.5">{rows.map(row=><li key={row.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-2 text-xs">
    <span className="truncate text-ink" title={row.label}>{row.label}</span>
    <span className="h-2.5 overflow-hidden rounded-full bg-soft" aria-hidden="true"><span className="block h-full rounded-full bg-brand" style={{width:`${Math.max(2,row.value/max*100)}%`}}/></span>
    <span className="tabular-nums text-muted">{row.value}{row.note?` · ${row.note}`:''}</span>
  </li>)}</ul>;
}

function Section({title,children}:{title:string;children:React.ReactNode}){
  return <section className="grid content-start gap-2 rounded-lg border border-line bg-white p-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>{children}</section>;
}

// Page opens, taps vs scans, link clicks and stand activity for one Multi-Link page.
export function MultiLinkInsights({endpoint}:{endpoint:string}){
  const [days,setDays]=useState<InsightRange>(30);
  const [data,setData]=useState<{insights:HostedPageInsights;labels:Record<string,string>}|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let live=true;setError('');
    fetch(`${endpoint}${endpoint.includes('?')?'&':'?'}days=${days}`).then(async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error||'Insights are unavailable.');if(live)setData(body);})
      .catch(e=>{if(live)setError(e instanceof Error?e.message:'Insights are unavailable.');});
    return()=>{live=false;};
  },[endpoint,days]);

  const insights=data?.insights;
  const buttonName=(id:string,type:string|null)=>data?.labels[id]||supportedHostedPageButtons.find(button=>button.type===type)?.label||'Link';
  const busiestDay=insights?.byWeekday.reduce((best,row)=>row.opens>(best?.opens??0)?row:best,undefined as undefined|{weekday:number;opens:number});
  const busiestHour=insights?.byHour.reduce((best,row)=>row.opens>(best?.opens??0)?row:best,undefined as undefined|{hour:number;opens:number});

  return <div className="grid gap-3 rounded-lg border border-line bg-soft p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-ink">Page insights</h3>
      <div role="group" aria-label="Date range" className="flex gap-1">{([7,30,90] as const).map(range=><button key={range} type="button" aria-pressed={days===range} onClick={()=>setDays(range)} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${days===range?'border-brand bg-white text-brand':'border-line bg-white text-muted'}`}>{range} days</button>)}</div>
    </div>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {!insights&&!error&&<p className="text-sm text-muted" role="status">Loading insights…</p>}
    {insights&&<>
      <div className="grid grid-cols-3 gap-2">
        {[['Page opens',insights.opens],['Link clicks',insights.clicks],['Click rate',`${pct(insights.clicks,insights.opens)}%`]].map(([label,value])=><div key={String(label)} className="rounded-lg border border-line bg-white p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-ink">{value}</p></div>)}
      </div>
      {insights.opens===0?<p className="text-sm text-muted">No activity in the last {days} days yet. Opens and clicks appear here as customers tap or scan the stand.</p>:<div className="grid gap-3 md:grid-cols-2">
        <Section title="Opens per day">
          <div className="flex h-24 items-end gap-0.5" role="img" aria-label={`Page opens per day over the last ${days} days`}>
            {insights.byDay.map(day=><span key={day.date} title={`${day.date}: ${day.opens} opens, ${day.clicks} clicks`} className="flex-1 rounded-t bg-brand opacity-80" style={{height:`${Math.max(4,day.opens/Math.max(1,...insights.byDay.map(d=>d.opens))*100)}%`}}/>)}
          </div>
        </Section>
        <Section title="Tap or scan"><Bars rows={(['nfc','qr','direct'] as const).map(source=>{const opens=insights.bySource.find(row=>row.source===source)?.opens??0;return {label:sourceLabel[source],value:opens,note:`${pct(opens,insights.opens)}%`};})}/></Section>
        <Section title="Links customers chose">{insights.byButton.length?<Bars rows={insights.byButton.map(row=>({label:buttonName(row.buttonId,row.buttonType),value:row.clicks,note:`${pct(row.clicks,insights.clicks)}%`}))}/>:<p className="text-xs text-muted">No link clicks yet.</p>}</Section>
        <Section title="When customers open it">
          <p className="text-xs text-muted">Busiest: <strong className="text-ink">{busiestDay?weekdays[busiestDay.weekday]:'—'}</strong>{busiestHour?<> around <strong className="text-ink">{hourLabel(busiestHour.hour)}</strong></>:null} (Eastern time)</p>
          <Bars rows={weekdays.map((name,weekday)=>({label:name,value:insights.byWeekday.find(row=>row.weekday===weekday)?.opens??0}))}/>
        </Section>
        <Section title="Phones"><Bars rows={(['ios','android','other'] as const).map(device=>{const opens=insights.byDevice.find(row=>row.device===device)?.opens??0;return {label:deviceLabel[device],value:opens,note:`${pct(opens,insights.opens)}%`};})}/></Section>
        <Section title="By stand">{insights.byStand.length?<ul className="grid gap-2">{insights.byStand.map(row=><li key={row.standId} className="grid gap-1 text-xs"><div className="flex items-baseline justify-between gap-2"><span className="min-w-0"><strong className="block truncate text-ink">{row.label||row.standId}</strong>{row.location&&<span className="block truncate text-muted">{row.location}</span>}</span><span className="shrink-0 tabular-nums text-muted">{row.opens} opens · {row.clicks} clicks</span></div><span className="h-2 overflow-hidden rounded-full bg-soft" aria-hidden="true"><span className="block h-full rounded-full bg-brand" style={{width:`${Math.max(2,row.opens/Math.max(1,...insights.byStand.map(stand=>stand.opens))*100)}%`}}/></span></li>)}</ul>:<p className="text-xs text-muted">Stand-by-stand numbers appear for stands whose tap and QR links carry their stand ID. Name each stand and set its location on My Stands.</p>}</Section>
      </div>}
      <p className="text-xs text-muted">Anonymous counts only: no cookies or personal details. Firefox doesn’t report link clicks.</p>
    </>}
  </div>;
}

// Insights in a popup, opened from a Multi-Link card.
export function MultiLinkInsightsDialog({title,endpoint,onClose}:{title:string;endpoint:string;onClose:()=>void}){
  const headingId=useId();
  return <ModalDialog labelledBy={headingId} onClose={onClose} className="px-3 py-2">
    <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
        <div className="min-w-0"><p className="tr-eyebrow">Multi-Link insights</p><h2 id={headingId} tabIndex={-1} data-dialog-heading className="mt-1 truncate text-base font-semibold text-ink focus:outline-none">{title}</h2></div>
        <button type="button" onClick={onClose} className="tr-icon-button shrink-0" aria-label="Close insights"><X size={18}/></button>
      </div>
      <div className="min-h-0 overflow-y-auto p-3"><MultiLinkInsights endpoint={endpoint}/></div>
    </div>
  </ModalDialog>;
}
