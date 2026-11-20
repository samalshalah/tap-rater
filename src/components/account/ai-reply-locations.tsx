'use client';
import {useCallback,useEffect,useState} from 'react';
import {Sparkles,X} from 'lucide-react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import {useReviewEndpoint} from './review-endpoint';
import type {Workspace} from './google-live-review-types';
import {ReviewAutomationControls} from './review-automation-controls';
import {ReviewScheduleSettings} from './review-schedule-settings';

type AiState={reviews_draft_only?:boolean;ai_consent?:boolean;auto_enabled?:boolean;auto_four?:boolean;auto_five?:boolean};

/** Short state for the sparkle button title. */
export function aiReplyState(l:AiState){
 if(!l.ai_consent)return 'off';
 // Draft-only packages never post, whatever the stored autopilot flags say.
 if(l.reviews_draft_only)return 'drafts only';
 if(l.auto_enabled&&(l.auto_four||l.auto_five))return `autopilot on · ${l.auto_four&&l.auto_five?'4–5 stars':l.auto_five?'5 stars':'4 stars'}`;
 return 'drafts only';
}

/** Sparkle shown on a Locations card; filled brand colour when AI replies are on. */
export function AiRepliesButton({name,location,onOpen}:{name:string;location:AiState;onOpen:()=>void}){
 const state=aiReplyState(location);
 return <button type="button" className={`tr-button-ghost tr-ai-replies-button${location.ai_consent?' is-on':''}`} title={`AI replies: ${state}`} aria-label={`AI replies for ${name}`} onClick={event=>{event.stopPropagation();onOpen();}}><Sparkles size={14} aria-hidden="true"/></button>;
}

/** Per-location AI reply controls (AI replies, autopilot, 1–3-star drafts, reply preferences, schedule). Used by the
 * Locations popup and by the "Activate replies" step of first-login setup. */
export function AiRepliesPanel({businessId,onSaved,showUsage=true,compact=false}:{businessId:string;onSaved?:()=>void;showUsage?:boolean;compact?:boolean}){
 const endpoint=useReviewEndpoint();
 const [workspace,setWorkspace]=useState<Workspace|null>(null),[error,setError]=useState('');
 const load=useCallback(async()=>{
  const r=await fetch(endpoint,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not load AI reply settings.');
  const w=(d.workspaces as Workspace[]|undefined)?.find(item=>item.business_id===businessId);
  if(!w)throw Error('AI replies are not available for this location yet. Connect Google first.');
  setWorkspace(w);setError('');
 },[endpoint,businessId]);
 useEffect(()=>{load().catch(e=>setError(e instanceof Error?e.message:'Could not load AI reply settings.'));},[load]);
 async function saved(){await load();onSaved?.();}
 const used=Number(workspace?.ai_monthly_used||0),limit=workspace?.ai_monthly_limit;
 return <div className="space-y-4">
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {!workspace&&!error&&<p role="status" className="text-sm text-muted">Loading AI reply settings…</p>}
  {workspace&&<>
   <ReviewAutomationControls location={{...workspace,id:workspace.business_id,connected:workspace.connected&&workspace.enabled}} onSaved={saved} compact={compact}/>
   {!compact&&!workspace.reviews_draft_only&&<div className="flex flex-wrap items-center gap-3"><ReviewScheduleSettings businessId={workspace.business_id}/></div>}
   {showUsage&&<p className="text-sm text-muted">AI usage this month: {limit!=null?`${used} / ${Number(limit)}`:used}.</p>}
  </>}
 </div>;
}

/** The AI reply controls opened as a popup from a Locations card. */
export function AiRepliesDialog({businessId,name,onClose,onSaved}:{businessId:string;name:string;onClose:()=>void;onSaved?:()=>void}){
 return <ModalDialog labelledBy="ai-replies-title" onClose={onClose}><div className="tr-card w-[min(560px,calc(100vw-32px))] max-h-[90dvh] space-y-4 overflow-auto p-5">
  <header className="flex items-start justify-between gap-3"><div><h2 id="ai-replies-title" data-dialog-heading tabIndex={-1} className="flex items-center gap-2 text-xl font-bold"><Sparkles size={18} className="text-brand" aria-hidden="true"/>AI replies</h2><p className="mt-1 text-sm text-muted">{name}</p></div><button type="button" className="tr-button-ghost" aria-label="Close AI replies" onClick={onClose}><X size={16}/></button></header>
  <AiRepliesPanel businessId={businessId} onSaved={onSaved}/>
 </div></ModalDialog>;
}
