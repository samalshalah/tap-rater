"use client";
import { useState } from 'react';
import { Settings,X } from 'lucide-react';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { replyStyles,type ReplyStyle } from '@/lib/review-ai-options';
import type { Post,Workspace } from './google-live-review-types';
import { ReviewScheduleSettings } from './review-schedule-settings';
export function LiveSettings({workspace:w,post,refresh,children}:{workspace:Workspace;post:Post;refresh:()=>Promise<void>;publishing:boolean;children?:React.ReactNode}){
 const [open,setOpen]=useState(false);
 const [ai,setAi]=useState(w.ai_consent),[style,setStyle]=useState(w.auto_style),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function save(){
  setBusy(true);setMessage('');try{await post({action:'settings',settings:{businessId:w.business_id,aiConsent:ai,autoEnabled:ai&&w.auto_enabled,four:w.auto_four,five:w.auto_five,style,version:w.settings_version,confirmAutomaticPosting:ai&&w.auto_enabled}});await refresh();setMessage('Review settings saved.');}catch(e){setMessage(e instanceof Error?e.message:'Settings could not be saved.');}finally{setBusy(false);}
 }
 function close(){if(busy)return;if((ai!==w.ai_consent||style!==w.auto_style)&&!window.confirm('Discard unsaved review settings?'))return;setAi(w.ai_consent);setStyle(w.auto_style);setOpen(false);}
 return <><button className="tr-button-ghost" onClick={()=>setOpen(true)}><Settings size={14}/>Settings</button>{open&&<ModalDialog labelledBy={'review-settings-'+w.business_id} onClose={close}><div className="tr-listing-dialog"><header><h2 id={'review-settings-'+w.business_id} tabIndex={-1} data-dialog-heading>Review settings · {w.business_name}</h2><button disabled={busy} aria-label="Close review settings" onClick={close}><X size={20}/></button></header>
 <ReviewScheduleSettings businessId={w.business_id}/><p className="mt-2 text-sm">New reviews are checked regularly in the background.</p>
 <p className="mt-2 text-xs text-muted">Last import: {w.synced_at?new Date(w.synced_at).toLocaleString():'Not completed'} · Last automatic draft check: {w.draft_checked_at?new Date(w.draft_checked_at).toLocaleString():'Not yet confirmed'}. Refresh this page for the latest status.</p>
 <p className="mt-2 text-sm">Monthly AI allowance: {w.ai_monthly_used??0} / {w.ai_monthly_limit??0} attempts used · shared with profile improvements.</p>
 <fieldset disabled={busy||!w.enabled||!w.connected} className="mt-3 space-y-3">
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={ai} onChange={e=>setAi(e.target.checked)}/>Use AI to prepare reply drafts from this location’s review text and ratings.</label>
 <label>Reply style <select className="rounded border p-2" value={style} onChange={e=>setStyle(e.target.value as ReplyStyle)}>{Object.entries(replyStyles).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <p className="text-xs text-muted">Review every draft before approval. Existing replies and saved drafts are preserved.</p>
 <button className="tr-button-ghost" onClick={save}>Save settings</button></fieldset>
 {w.draft_error&&<p role="status" className="mt-3 text-sm text-amber-800">{w.draft_error}</p>}
 <p role="status" className="mt-2 text-sm">{message}</p><details className="mt-4 text-xs text-muted"><summary className="cursor-pointer">Import limits & privacy</summary><p className="mt-2">AI uses this location’s monthly package allowance, shared with profile improvements, with a rolling hourly safety limit of 20 review generations. Remaining reviews wait for the next available run. Imported Google content is retained for up to 30 days and refreshed while connected. <a href="/privacy-policy" className="underline">Privacy policy</a></p></details><details className="mt-4 text-sm"><summary className="cursor-pointer">Google connection</summary><div className="mt-3">{children}</div><p className="mt-2 text-xs text-muted">To remove Tap Rater’s manager access, use Google Business Profile’s People and access settings or <a className="underline" href="mailto:support@taprater.com">contact support</a>.</p></details></div></ModalDialog>}</>;
}

