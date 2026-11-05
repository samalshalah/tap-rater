"use client";
import { useState } from 'react';
import { Settings,X } from 'lucide-react';
import { ModalDialog } from '@/components/ui/modal-dialog';
import type { Workspace } from './google-live-review-types';
import { ReviewScheduleSettings } from './review-schedule-settings';
import { ReviewAutomationControls } from './review-automation-controls';
export function LiveSettings({workspace:w,refresh,children}:{workspace:Workspace;refresh:()=>Promise<void>;children?:React.ReactNode}){
 const [open,setOpen]=useState(false);
 function close(){setOpen(false);}
 return <><button className="tr-button-ghost" onClick={()=>setOpen(true)}><Settings size={14}/>Settings</button>{open&&<ModalDialog labelledBy={'review-settings-'+w.business_id} onClose={close}><div className="tr-listing-dialog"><header><h2 id={'review-settings-'+w.business_id} tabIndex={-1} data-dialog-heading>Settings · {w.business_name}</h2><button aria-label="Close review settings" onClick={close}><X size={20}/></button></header>
 <section className="mt-4 rounded-lg border border-line bg-white p-4"><h3 className="mb-3 text-sm font-semibold">Reply automation</h3><ReviewAutomationControls location={{...w,id:w.business_id,connected:w.connected&&w.enabled}} onSaved={refresh}/></section>
 <ReviewScheduleSettings businessId={w.business_id}/><p className="mt-2 text-sm">New reviews are checked regularly in the background.</p>
 <p className="mt-2 text-xs text-muted">Last import: {w.synced_at?new Date(w.synced_at).toLocaleString():'Not completed'} · Last automatic draft check: {w.draft_checked_at?new Date(w.draft_checked_at).toLocaleString():'Not yet confirmed'}. Refresh this page for the latest status.</p>
 <p className="mt-2 text-sm">Monthly AI allowance: {w.ai_monthly_used??0} / {w.ai_monthly_limit??0} attempts used · shared with profile improvements.</p>
 {w.draft_error&&<p role="status" className="mt-3 text-sm text-amber-800">{w.draft_error}</p>}
 <details className="mt-4 text-xs text-muted"><summary className="cursor-pointer">Import limits & privacy</summary><p className="mt-2">AI uses this location’s monthly package allowance, shared with profile improvements, with a rolling hourly safety limit of 60 review generations. Remaining reviews wait for the next available run. Imported Google content is retained for up to 30 days and refreshed while connected. <a href="/privacy-policy" className="underline">Privacy policy</a></p></details><details className="mt-4 text-sm"><summary className="cursor-pointer">Google connection</summary><div className="mt-3">{children}</div><p className="mt-2 text-xs text-muted">To remove Tap Rater’s manager access, use Google Business Profile’s People and access settings or <a className="underline" href="mailto:support@taprater.com">contact support</a>.</p></details></div></ModalDialog>}</>;
}

