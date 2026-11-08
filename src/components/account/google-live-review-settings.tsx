"use client";
import { useEffect,useState } from 'react';
import dynamic from 'next/dynamic';
import { Settings,X,ArrowUpRight,Link2 } from 'lucide-react';
import { ModalDialog } from '@/components/ui/modal-dialog';
import type { Workspace } from './google-live-review-types';
import { ReviewScheduleSettings } from './review-schedule-settings';
import { ReviewAutomationControls } from './review-automation-controls';
const GoogleConnectionWizard=dynamic(()=>import('./google-connection-wizard').then(module=>module.GoogleConnectionWizard),{loading:()=> <p role="status">Loading Google connection…</p>});
export function LiveSettings({workspace:w,refresh,children,allowGoogleConnection=true}:{workspace:Workspace;refresh:()=>Promise<void>;children?:React.ReactNode;allowGoogleConnection?:boolean}){
 const [open,setOpen]=useState(false),[connectionOpen,setConnectionOpen]=useState(false);
 const used=Number(w.ai_monthly_used||0),limit=Number(w.ai_monthly_limit||0);
 const draftNotice=w.draft_error?.includes('Monthly AI allowance exhausted')?'Monthly AI limit reached. Drafting will resume when it resets.':w.draft_error?.toLowerCase().includes('hourly ai limit')?'Hourly AI limit reached. Drafting will resume automatically.':w.draft_error;
 useEffect(()=>{const url=new URL(window.location.href);if(allowGoogleConnection&&url.searchParams.has('connection')&&url.searchParams.get('location')===w.business_id)setConnectionOpen(true);},[allowGoogleConnection,w.business_id]);
 function close(){setOpen(false);}
 async function linked(){setConnectionOpen(false);const url=new URL(window.location.href);for(const key of ['connection','step','reason','location'])url.searchParams.delete(key);window.history.replaceState(null,'',url);await refresh();}
 return <><button className="tr-button-ghost" onClick={()=>setOpen(true)}><Settings size={14}/>Settings</button>{open&&<ModalDialog labelledBy={'review-settings-'+w.business_id} onClose={close}><div className="tr-listing-dialog"><header><h2 id={'review-settings-'+w.business_id} tabIndex={-1} data-dialog-heading>Settings · {w.business_name}</h2><button aria-label="Close review settings" onClick={close}><X size={20}/></button></header>
 <section className="mt-4 rounded-lg border border-line bg-white p-4"><h3 className="mb-3 text-sm font-semibold">Reply settings</h3><ReviewAutomationControls location={{...w,id:w.business_id,connected:w.connected&&w.enabled}} onSaved={refresh}/></section>
 <ReviewScheduleSettings businessId={w.business_id}/>
 <p className="mt-3 text-sm">AI usage this month: {limit?`${used} / ${limit}`:used}.</p>
 {draftNotice&&<p role="status" className="mt-2 text-sm text-amber-800">{draftNotice}</p>}
 {allowGoogleConnection&&<section className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 size={16}/>Google connection</h3><p className="mt-1 text-xs text-muted">Connect or update this location.</p></div><button type="button" className="tr-button-primary" onClick={()=>setConnectionOpen(true)}>{w.connected?'Manage Google connection':'Connect Google'}<ArrowUpRight size={14}/></button></div>{children&&<details className="mt-3 text-xs text-muted"><summary className="cursor-pointer">Other connection actions</summary><div className="mt-2 flex flex-wrap gap-2">{children}</div></details>}</section>}
 {!allowGoogleConnection&&children&&<details className="mt-4 text-xs text-muted"><summary className="cursor-pointer">Location actions</summary><div className="mt-2 flex flex-wrap gap-2">{children}</div></details>}
 <details className="mt-4 text-xs text-muted"><summary className="cursor-pointer">Limits & privacy</summary><p className="mt-2">AI replies have monthly and hourly limits. Google reviews are kept for up to 30 days. <a href="/privacy-policy" className="underline">Privacy policy</a></p></details></div></ModalDialog>}{connectionOpen&&allowGoogleConnection&&<ModalDialog labelledBy={'google-connection-'+w.business_id} onClose={()=>setConnectionOpen(false)}><div className="tr-listing-dialog"><header><h2 id={'google-connection-'+w.business_id} tabIndex={-1} data-dialog-heading>Google connection · {w.business_name}</h2><button aria-label="Close Google connection" onClick={()=>setConnectionOpen(false)}><X size={20}/></button></header><GoogleConnectionWizard key={w.business_id} businessId={w.business_id} compact onClose={()=>setConnectionOpen(false)} onLinked={linked}/></div></ModalDialog>}</>;
}

