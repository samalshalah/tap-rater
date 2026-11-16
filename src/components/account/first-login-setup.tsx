'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {X} from 'lucide-react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import type {GoogleBusinessSelection} from '@/lib/google-places-client';
import {SetupBusinessPicker} from './setup-business-picker';
import {GoogleConnectionWizard} from './google-connection-wizard';
type Progress={completed:string|null;business_id:string|null;business_name:string;connected:boolean;synced_at:string|null;next_page:string|null;profile_synced:string|null;last_error:string|null;review_count:number;review_total:number|null};
export function FirstLoginSetup({children}:{children:ReactNode}){
 const router=useRouter();
 const [dismissed,setDismissed]=useState(false);
 const [progress,setProgress]=useState<Progress|null>(null),[selection,setSelection]=useState<GoogleBusinessSelection|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 async function request(body?:unknown){const r=await fetch('/api/account/onboarding',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Setup is unavailable.');setProgress(d);return d as Progress;}
 useEffect(()=>{request().catch(e=>setError(e.message));},[retry]);
 const needsSetup=Boolean(progress&&!progress.completed&&!dismissed);
 const ready=Boolean(progress?.synced_at&&!progress.next_page&&!progress.last_error);
 useEffect(()=>{
  if(!progress?.connected||ready||progress.completed||error)return;
  let stopped=false;const timer=window.setTimeout(async()=>{setBusy(true);try{await request({action:'import'});}catch(e){if(!stopped)setError(e instanceof Error?e.message:'Import paused.');}finally{if(!stopped)setBusy(false);}},11000);
  return()=>{stopped=true;window.clearTimeout(timer);};
 },[progress,ready,error]);
 async function next(){setBusy(true);setError('');try{if(ready){await request({action:'finish'});router.replace('/account/reviews');router.refresh();}else if(selection)await request({action:'choose',name:selection.name,address:selection.formattedAddress,placeId:selection.placeId});}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 if(progress?.completed)return <>{children}</>;
 if(!progress)return error?<div role="alert"><p>{error}</p><button className="tr-button-ghost" onClick={()=>{setError('');setRetry(n=>n+1);}}>Retry</button></div>:<div aria-busy="true" aria-label="Loading account" className="h-24 animate-pulse rounded-lg bg-slate-100"/>;
 const total=progress?.review_total;
 const percent=ready?100:typeof total==='number'&&total>0?Math.min(99,Math.floor((progress?.review_count||0)/total*100)):null;
 const step=!progress?.business_id?0:!progress.connected?1:!ready?2:3;
 return <>{dismissed?<><div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3"><span className="text-sm">Finish setting up your business</span><button className="tr-button-primary" onClick={()=>setDismissed(false)}>Continue setup</button></div>{children}</>:<p className="text-sm text-muted">Complete your business setup to open your dashboard.</p>}{needsSetup&&<ModalDialog labelledBy="first-setup-title" onClose={()=>setDismissed(true)} className="px-3 py-4 backdrop:backdrop-blur-sm"><div className="tr-prismatic-storefront flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden bg-white" style={{borderRadius:'var(--tr-radius-card)',boxShadow:'var(--tr-shadow-elevated)'}}>
 <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 sm:px-6 sm:py-4"><div><p className="tr-eyebrow">Google Reviews</p><h1 id="first-setup-title" tabIndex={-1} data-dialog-heading className="mt-1 text-xl font-semibold text-ink focus:outline-none sm:text-2xl">Set up your business</h1></div><button type="button" className="tr-icon-button shrink-0" aria-label="Close business setup" onClick={()=>setDismissed(true)}><X size={18}/></button></header>
 <div className="border-b border-line px-4 py-3 sm:px-6"><ol className="grid grid-cols-4 gap-2 text-[10px] font-semibold uppercase text-muted sm:text-xs">{['Find business','Connect Google','Import reviews','Done'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined} className={`${i<step?'bg-panel text-brand':i===step?'bg-ink text-white':'border border-line'} flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center sm:flex-row sm:gap-2`}><span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-[11px] text-ink">{i+1}</span><span>{label}</span></li>)}</ol></div>
 <div className="overflow-y-auto px-4 py-5 sm:px-6">
 {!progress&&!error&&<p role="status">Loading setup…</p>}
 {progress&&step===0&&<><p className="mb-3 text-sm">Search by business name and address, then select the location you want to manage.</p><SetupBusinessPicker onChange={setSelection}/><button className="tr-button-primary mt-4" disabled={!selection||busy} onClick={next}>Next</button></>}
 {progress&&step===1&&<><p className="text-sm">Selected business: {progress.business_name}</p><GoogleConnectionWizard compact businessId={progress.business_id!} onLinked={async()=>{await request();}}/></>}
 {step===2&&<div className="py-8 text-center"><h2 className="font-semibold">Importing reviews for {progress?.business_name}</h2><div className="mx-auto mt-5 max-w-lg"><div className="mb-2 flex justify-between text-sm" role="status"><span>{progress?.review_count||0}{typeof total==='number'?` of ${total}`:''} reviews imported</span><strong>{percent===null?'Preparing…':`${percent}%`}</strong></div><div role="progressbar" aria-label="Review import progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent??undefined} className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-brand transition-[width] duration-500 ${percent===null?'w-1/3 animate-pulse':''}`} style={{backgroundColor:'var(--tr-color-brand)',...(percent===null?{}:{width:`${percent}%`})}}/></div></div><p className="mt-3 text-sm text-muted">{error?'Import paused. Your progress is saved.':null}</p><p className="mt-2 text-xs text-muted">You can return later; setup resumes at this step.</p></div>}
 {step===3&&<div className="space-y-4 py-6"><div role="progressbar" aria-label="Review import complete" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100} className="h-2.5 rounded-full bg-brand" style={{backgroundColor:'var(--tr-color-brand)'}}/><p className="text-sm font-semibold text-brand">100% complete</p><h2 className="text-lg font-semibold">Your business is ready</h2><p>{progress?.business_name} · {progress?.review_count} reviews imported.</p><p>Your reviews are ready. AI drafting starts off. Open Reply settings to choose your drafting preferences. Your package controls whether publishing is available.</p><button className="tr-button-primary" disabled={busy} onClick={next}>Open Reviews</button></div>}
 {error&&<div className="mt-4" role="alert"><p className="text-red-700">{error}</p><button className="tr-button-ghost mt-2" onClick={()=>{setError('');setRetry(n=>n+1);}}>Retry</button></div>}
 </div></div></ModalDialog>}</>;
}
