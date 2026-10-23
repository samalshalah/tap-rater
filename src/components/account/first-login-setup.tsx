'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {GoogleBusinessSelection} from '@/lib/google-places-client';
import {SetupBusinessPicker} from './setup-business-picker';
import {GoogleConnectionWizard} from './google-connection-wizard';
type Progress={completed:string|null;business_id:string|null;business_name:string;connected:boolean;synced_at:string|null;next_page:string|null;profile_synced:string|null;last_error:string|null;review_count:number};
export function FirstLoginSetup({children}:{children:ReactNode}){
 const [progress,setProgress]=useState<Progress|null>(null),[selection,setSelection]=useState<GoogleBusinessSelection|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 const dialog=useRef<HTMLDialogElement>(null);
 async function request(body?:unknown){const r=await fetch('/api/account/onboarding',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Setup is unavailable.');setProgress(d);return d as Progress;}
 useEffect(()=>{request().catch(e=>setError(e.message));},[retry]);
 useEffect(()=>{if(!progress?.completed&&!dialog.current?.open)dialog.current?.showModal();},[progress]);
 const ready=Boolean(progress?.synced_at&&!progress.next_page&&!progress.last_error&&progress.profile_synced);
 useEffect(()=>{
  if(!progress?.connected||ready||progress.completed||error)return;
  let stopped=false;const timer=window.setTimeout(async()=>{setBusy(true);try{await request({action:'import'});}catch(e){if(!stopped)setError(e instanceof Error?e.message:'Import paused.');}finally{if(!stopped)setBusy(false);}},11000);
  return()=>{stopped=true;window.clearTimeout(timer);};
 },[progress,ready,error]);
 async function next(){setBusy(true);setError('');try{if(ready)await request({action:'finish'});else if(selection)await request({action:'choose',name:selection.name,address:selection.formattedAddress,reviewUrl:selection.reviewUrl,placeId:selection.placeId});}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 if(progress?.completed)return <>{children}</>;
 const step=!progress?.business_id?0:!progress.connected?1:!ready?2:3;
 return <><p className="text-sm text-muted">Complete your business setup to open your dashboard.</p><dialog ref={dialog} onCancel={e=>e.preventDefault()} aria-labelledby="first-setup-title" className="m-auto max-h-[90vh] w-[min(760px,94vw)] overflow-y-auto rounded-xl border border-line bg-white p-6 text-ink shadow-xl backdrop:bg-slate-900/40">
 <h1 id="first-setup-title" className="text-xl font-semibold">Set up your business</h1><ol className="my-4 flex flex-wrap gap-3 text-sm">{['Find business','Connect Google','Import information','Done'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined} className={step===i?'font-semibold text-teal-700':'text-muted'}>{i+1}. {label}</li>)}</ol>
 {!progress&&!error&&<p role="status">Loading setup…</p>}
 {progress&&step===0&&<><p className="mb-3 text-sm">Search by business name and address, then select the location you want to manage.</p><SetupBusinessPicker onChange={setSelection}/><button className="tr-button-primary mt-4" disabled={!selection||busy} onClick={next}>Next</button></>}
 {progress&&step===1&&<><p className="text-sm">Selected: {progress.business_name}. Choose the same location in Google below.</p><GoogleConnectionWizard compact businessId={progress.business_id!} onLinked={async()=>{await request();}}/></>}
 {step===2&&<div className="py-10 text-center" role="status"><div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-line border-t-teal-600"/><h2 className="font-semibold">Importing your business information</h2><p className="mt-2 text-sm">{progress?.review_count||0} reviews imported. We’re loading the profile and remaining review pages.</p><p className="mt-2 text-sm text-muted">You can return later; setup resumes at this step.</p></div>}
 {step===3&&<div className="space-y-4 py-6"><h2 className="text-lg font-semibold">Your business is ready</h2><p>{progress?.business_name} · {progress?.review_count} reviews imported.</p><p>Replies and profile changes stay as drafts for your approval.</p><button className="tr-button-primary" disabled={busy} onClick={next}>Open dashboard</button></div>}
 {error&&<div className="mt-4" role="alert"><p className="text-red-700">{error}</p><button className="tr-button-ghost mt-2" onClick={()=>{setError('');setRetry(n=>n+1);}}>Retry</button></div>}
 <p className="mt-5 text-xs text-muted">Each location is managed separately. Nothing is published during setup.</p></dialog></>;
}
