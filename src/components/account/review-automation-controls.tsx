'use client';
import {ReviewScheduleSettings} from './review-schedule-settings';
import {AiKnowledgeSettings} from './ai-knowledge-settings';
import {useState,useRef} from 'react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import type {ReplyStyle} from '@/lib/review-ai-options';
export type ReviewAutomation={id:string;connected:boolean;ai_consent?:boolean;auto_enabled?:boolean;auto_four?:boolean;auto_five?:boolean;auto_style?:string;profile_ai_enabled?:boolean;settings_version?:number;reply_delay_minutes?:number;draft_low_stars?:boolean};
export function Toggle({label,on,disabled,onChange}:{label:string;on:boolean;disabled?:boolean;onChange:()=>void}){return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onChange} className="inline-flex items-center gap-2 text-sm disabled:opacity-50"><span className={'relative inline-block h-5 w-9 rounded-full transition-colors '+(on?'bg-teal-600':'bg-slate-300')}><span className={'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all '+(on?'left-[18px]':'left-0.5')}/></span><span>{label}</span><span className="text-xs text-muted">{on?'On':'Off'}</span></button>;}
type AutomationWorkspace={business_id:string;business_name:string;ai_consent:boolean;auto_enabled:boolean;auto_four:boolean;auto_five:boolean;auto_style:ReplyStyle;settings_version:number;reply_delay_minutes:number;draft_low_stars:boolean};
type AutomationChange='ai'|'positive'|'low';
type PendingAutomation={kind:'positive'|'low';workspace:AutomationWorkspace};
export function ReviewAutomationControls({location,onSaved}:{location:ReviewAutomation;onSaved:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState<PendingAutomation|null>(null);
 const activeLocation=useRef(location.id);activeLocation.current=location.id;
 const positiveOn=Boolean(location.ai_consent&&location.auto_enabled&&(location.auto_four||location.auto_five));
 async function save(w:AutomationWorkspace,key:AutomationChange,enabled:boolean){
  const ai=key==='ai'?enabled:w.ai_consent;
  const automatic=ai&&(key==='positive'?enabled:w.auto_enabled);
  const r=await fetch('/api/account/reviews/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'settings',settings:{businessId:w.business_id,aiConsent:ai,autoEnabled:automatic,four:key==='positive'?enabled:w.auto_four,five:key==='positive'?enabled:w.auto_five,lowStars:key==='low'?enabled:w.draft_low_stars!==false,style:w.auto_style||'friendly',version:w.settings_version,confirmAutomaticPosting:automatic,delayMinutes:w.reply_delay_minutes??120}})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Settings could not be saved.');
  setPending(null);await onSaved();
 }
 async function change(key:AutomationChange,enabled:boolean){
  const id=location.id;setBusy(true);setError('');
  try{
   // Read the saved delay and version, including changes made in Reply schedule.
   const r=await fetch('/api/account/reviews/live',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not load review settings.');
   const w=d.workspaces?.find((item:AutomationWorkspace)=>item.business_id===id) as AutomationWorkspace|undefined;
   if(!w)throw Error('This location is unavailable.');if(activeLocation.current!==id)return;
   if(enabled&&key!=='ai'&&!w.ai_consent)throw Error('Turn on AI replies for this location first.');
   if(enabled&&(key==='positive'||key==='low'))setPending({kind:key,workspace:w});
   else await save(w,key,enabled);
  }catch(e){setError(e instanceof Error?e.message:'Settings could not be saved.');}finally{setBusy(false);}
 }
 async function confirm(){if(!pending||pending.workspace.business_id!==location.id)return;setBusy(true);setError('');try{await save(pending.workspace,pending.kind,true);}catch(e){setError(e instanceof Error?e.message:'Settings could not be saved.');}finally{setBusy(false);}}
 const shown=pending?.workspace.business_id===location.id?pending:null;
 const hours=(shown?.workspace.reply_delay_minutes??120)/60;
 return <div className="space-y-3"><div className="flex flex-wrap items-center gap-5">
 <Toggle label="AI replies" on={Boolean(location.ai_consent)} disabled={busy||!location.connected} onChange={()=>change('ai',!location.ai_consent)}/>
 <Toggle label="4–5-star autopilot" on={positiveOn} disabled={busy||!location.connected||!location.ai_consent} onChange={()=>change('positive',!positiveOn)}/>
 <Toggle label="1–3-star drafts" on={Boolean(location.ai_consent&&location.draft_low_stars!==false)} disabled={busy||!location.connected||!location.ai_consent} onChange={()=>change('low',location.draft_low_stars===false)}/>
 </div><p className="text-xs text-muted">1–3-star replies require your approval and submission.{positiveOn&&location.auto_four!==location.auto_five&&<span> Currently {location.auto_five?'5':'4'}-star autopilot only.</span>}</p>
 <ReviewScheduleSettings businessId={location.id}/><AiKnowledgeSettings businessId={location.id} onSaved={onSaved}/>
 {error&&!shown&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 {shown&&<ModalDialog labelledBy="review-automation-heading" onClose={()=>{if(!busy){setPending(null);setError('');}}}><section className="tr-listing-dialog" style={{width:'min(540px,calc(100vw - 28px))',height:320}}>
 <header><h2 id="review-automation-heading" tabIndex={-1} data-dialog-heading>{shown.kind==='positive'?'Enable 4–5-star autopilot?':'Enable 1–3-star drafts?'}</h2><button disabled={busy} aria-label="Close review automation" onClick={()=>{setPending(null);setError('');}}>✕</button></header>
 <p className="text-sm text-muted">{shown.workspace.business_name}</p>
 <div className="mt-5 rounded-md bg-slate-50 p-4"><p className="font-medium">{shown.kind==='positive'?`4–5 stars · ${hours} ${hours===1?'hour':'hours'} delay`:'1–3 stars · Drafts only'}</p><p className="mt-2 text-sm">{shown.kind==='positive'?`New 4–5-star replies will be published to Google no earlier than ${hours} ${hours===1?'hour':'hours'} after the draft is prepared.`:'AI will prepare replies for you to review and submit. These replies are never published automatically.'}</p></div>
 {shown.kind==='positive'&&<p className="mt-3 text-xs text-muted">Older reviews are managed separately in Reply schedule.</p>}
 {error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
 <footer className="mt-5"><button className="tr-button-ghost" disabled={busy} onClick={()=>{setPending(null);setError('');}}>Cancel</button><button className="tr-button-primary" disabled={busy} onClick={confirm}>{busy?'Saving…':shown.kind==='positive'?'Enable autopilot':'Enable drafts'}</button></footer>
 </section></ModalDialog>}
 </div>;
}

export function ProfileAgentControls({location,onSaved,onReview}:{location:ReviewAutomation;onSaved:()=>Promise<void>;onReview:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function change(){setBusy(true);setError('');try{const r=await fetch('/api/account/reviews/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profileAgent',settings:{businessId:location.id,enabled:!location.profile_ai_enabled,version:location.settings_version}})});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not save settings.');await onSaved();}catch(e){setError(e instanceof Error?e.message:'Could not save settings.');}finally{setBusy(false);}}
 return <section className="rounded-lg border border-line bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">Google AI agent</h2><Toggle label="Profile improvements" on={Boolean(location.profile_ai_enabled)} disabled={busy||!location.connected} onChange={change}/></div><p className="mt-2 text-sm text-muted">Checks your profile and prepares improvement drafts for your review.</p><button className="mt-3 text-sm text-teal-700" onClick={onReview}>Review improvements →</button>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</section>;
}
