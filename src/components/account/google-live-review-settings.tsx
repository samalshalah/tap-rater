"use client";
import { useState } from 'react';
import { Settings,X } from 'lucide-react';
import { ModalDialog } from '@/components/ui/modal-dialog';
import type { Workspace } from './google-live-review-types';
import { ReviewScheduleSettings } from './review-schedule-settings';
import { ReviewAutomationControls } from './review-automation-controls';
export function LiveSettings({workspace:w,refresh,children}:{workspace:Workspace;refresh:()=>Promise<void>;children?:React.ReactNode}){
 const [open,setOpen]=useState(false);
 const used=Number(w.ai_monthly_used||0),limit=Number(w.ai_monthly_limit||0);
 const draftNotice=w.draft_error?.includes('Monthly AI allowance exhausted')?'Monthly AI limit reached. Drafting will resume when it resets.':w.draft_error?.toLowerCase().includes('hourly ai limit')?'Hourly AI limit reached. Drafting will resume automatically.':w.draft_error;
 function close(){setOpen(false);}
 return <><button className="tr-button-ghost" onClick={()=>setOpen(true)}><Settings size={14}/>Settings</button>{open&&<ModalDialog labelledBy={'review-settings-'+w.business_id} onClose={close}><div className="tr-listing-dialog"><header><h2 id={'review-settings-'+w.business_id} tabIndex={-1} data-dialog-heading>Settings · {w.business_name}</h2><button aria-label="Close review settings" onClick={close}><X size={20}/></button></header>
 <section className="mt-4 rounded-lg border border-line bg-white p-4"><h3 className="mb-3 text-sm font-semibold">Reply settings</h3><ReviewAutomationControls location={{...w,id:w.business_id,connected:w.connected&&w.enabled}} onSaved={refresh}/></section>
 <ReviewScheduleSettings businessId={w.business_id}/>
 <p className="mt-3 text-sm">AI usage this month: {limit?`${used} / ${limit}`:used}.</p>
 {draftNotice&&<p role="status" className="mt-2 text-sm text-amber-800">{draftNotice}</p>}
 <details className="mt-4 text-xs text-muted"><summary className="cursor-pointer">Limits & privacy</summary><p className="mt-2">AI replies have monthly and hourly limits. Google reviews are kept for up to 30 days. <a href="/privacy-policy" className="underline">Privacy policy</a></p></details><details className="mt-4 text-sm"><summary className="cursor-pointer">Google connection</summary><div className="mt-3">{children}</div><p className="mt-2 text-xs text-muted">Manage Tap Rater’s access in Google Business Profile, or <a className="underline" href="mailto:support@taprater.com">contact support</a>.</p></details></div></ModalDialog>}</>;
}

