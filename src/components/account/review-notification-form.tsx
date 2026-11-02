'use client';
import {useState} from 'react';
import type {ReviewEmailSettings} from '@/lib/review-email-preferences';
type Props={initial:ReviewEmailSettings;name:string;email:string};
export function ReviewNotificationForm({initial,name,email}:Props){
 const [v,setV]=useState(initial),[saved,setSaved]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 function field<K extends keyof ReviewEmailSettings>(key:K,value:ReviewEmailSettings[K]){setV({...v,[key]:value});setMessage('');}
 async function save(){
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/account/review-notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Could not save settings.');
   const next={...v,version:result.version};setV(next);setSaved(next);setMessage('Notification settings saved.');
  }catch(e){setMessage(e instanceof Error?e.message:'Could not save settings.');}finally{setBusy(false);}
 }
 const zones=Array.from(new Set([v.zone,'UTC',...Intl.supportedValuesOf('timeZone')])).sort();
 const timed=v.weekly||v.monthly||v.highMode==='daily'||v.lowMode==='daily';
 return <form className="space-y-5 rounded-xl border border-line bg-white p-5" onSubmit={e=>{e.preventDefault();void save();}}>
 <div><h2 className="text-xl font-bold">{name}</h2><p>Email delivery to {email}</p></div>
 <fieldset disabled={busy} className="space-y-3"><legend className="font-semibold">New review alerts</legend>
 {(['lowMode','highMode'] as const).map(k=><label className="block" key={k}>{k==='lowMode'?'1–3-star reviews':'4–5-star reviews'}<select className="tr-input ml-2" value={v[k]} onChange={e=>field(k,e.target.value as ReviewEmailSettings[typeof k])}><option value="off">Off</option><option value="immediate">As reviews arrive</option><option value="daily">Daily digest</option></select></label>)}
 <p className="text-sm text-muted">Alerts start with reviews written after you save. Daily digests arrive only when there are new reviews.</p></fieldset>
 <fieldset disabled={busy} className="space-y-2"><legend className="font-semibold">Email reports</legend>
 <label className="block"><input type="checkbox" checked={v.weekly} onChange={e=>field('weekly',e.target.checked)}/> Weekly report · Mondays</label>
 <label className="block"><input type="checkbox" checked={v.monthly} onChange={e=>field('monthly',e.target.checked)}/> Monthly report · First of each month</label></fieldset>
 {timed&&<fieldset disabled={busy} className="space-y-2"><legend className="font-semibold">Digest and report delivery</legend>
 <label className="block">Time zone <select className="tr-input" value={v.zone} onChange={e=>field('zone',e.target.value)}>{zones.map(z=><option key={z}>{z}</option>)}</select></label>
 <label className="block">Send around <select className="tr-input" value={v.hour} onChange={e=>field('hour',Number(e.target.value))}>{Array.from({length:24},(_,h)=><option key={h} value={h}>{h%12||12}:00 {h<12?'AM':'PM'}</option>)}</select></label></fieldset>}
 <button disabled={busy||JSON.stringify(v)===JSON.stringify(saved)} className="tr-button-primary">{busy?'Saving…':'Save notification settings'}</button>
 <p role="status" aria-live="polite">{message}</p></form>;
}
