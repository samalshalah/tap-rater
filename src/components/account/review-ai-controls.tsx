"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {replyStyles,type AutoReplySettings,type ReplyStyle,type ReplySuggestions} from "@/lib/review-ai-options";
async function post(endpoint:string,body:unknown){
 const r=await fetch(endpoint+"/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw new Error(data.error || "Could not complete the request.");return data;
}
export function ReviewAiSuggestions({id,endpoint,onChoose,disabled}:{id:string;endpoint:string;onChoose:(reply:string)=>void;disabled:boolean}){
 const [suggestions,setSuggestions]=useState<ReplySuggestions|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function generate(){
  setBusy(true);setError("");
  try{const data=await post(endpoint,{action:"suggest",id});setSuggestions(data.suggestions);}
  catch(e){setError(e instanceof Error?e.message:"AI is unavailable.");}
  finally{setBusy(false);}
 }
 return <section className="mt-5 rounded-lg border border-line bg-soft p-4" aria-label="AI reply suggestions">
  <button type="button" className="tr-button-ghost" disabled={busy||disabled} onClick={generate}>{busy?"Writing four suggestions…":suggestions?"Generate new suggestions":"Suggest replies with AI"}</button>
  <p className="mt-2 text-xs leading-5 text-muted">AI can make mistakes. Check the details, choose a style, then edit and save your reply. Generating suggestions does not change your draft.</p>
  {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  {suggestions && <div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(replyStyles).map(([key,label])=><div key={key} className="rounded-lg border border-line bg-white p-3">
   <h4 className="text-sm font-semibold">{label}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{suggestions[key as ReplyStyle]}</p>
   <button type="button" className="mt-3 text-sm font-semibold text-brand underline" disabled={disabled} onClick={()=>onChoose(suggestions[key as ReplyStyle])}>Use {label} reply</button>
  </div>)}</div>}
 </section>;
}
export function ReviewAutoSettings({businessId,initial,endpoint}:{businessId:string;initial:AutoReplySettings;endpoint:string}){
 const router=useRouter();const [settings,setSettings]=useState(initial);
 const [saved,setSaved]=useState(initial);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const dirty=JSON.stringify(settings)!==JSON.stringify(saved);
 async function save(){
  setBusy(true);setMessage("");
  try{const data=await post(endpoint,{action:"settings",settings:{businessId,...settings}});setSaved(data.settings);setSettings(data.settings);setMessage(data.settings.enabled?"Automatic practice drafts enabled. Nothing will be published to Google.":"Automatic practice drafts are off.");}
  catch(e){setMessage(e instanceof Error?e.message:"Could not save settings.");}finally{setBusy(false);}
 }
 async function run(){
  setBusy(true);setMessage("");
  try{const data=await post(endpoint,{action:"run",businessId});setMessage(data.saved?"An AI practice draft was saved. Review it below.":"No eligible unanswered reviews right now. Existing drafts are kept; recent attempts may need 15 minutes before retrying.");if(data.saved)router.refresh();}
  catch(e){setMessage(e instanceof Error?e.message:"Could not prepare the draft.");}finally{setBusy(false);}
 }
 return <section aria-label="Automatic reply settings" className="rounded-xl border border-line bg-white p-5">
  <h3 className="text-lg font-semibold">Automatic replies · Sample trial</h3>
  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">In this trial, AI saves editable practice drafts for unanswered reviews about every 15 minutes. It never publishes. Live automatic posting will require separate activation after Google access is approved and tested.</p>
  <fieldset disabled={busy} className="mt-4 space-y-3">
   <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={settings.enabled} onChange={e=>setSettings({...settings,enabled:e.target.checked})}/>Enable automatic practice drafts</label>
   <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.four} onChange={e=>setSettings({...settings,four:e.target.checked})}/>4-star reviews</label>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.five} onChange={e=>setSettings({...settings,five:e.target.checked})}/>5-star reviews</label></div>
   <label className="block text-sm font-semibold">Automatic reply style<select className="ml-3 rounded-lg border border-line bg-white p-2" value={settings.style} onChange={e=>setSettings({...settings,style:e.target.value as ReplyStyle})}>{Object.entries(replyStyles).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <p className="text-xs text-muted">1–3-star reviews always stay manual. Existing replies are never replaced. 20 AI generations per business per rolling hour.</p>
   <div className="flex flex-wrap gap-2"><button type="button" className="tr-button-primary" disabled={busy || (settings.enabled&&!settings.four&&!settings.five)} onClick={save}>Save automatic reply settings</button>
   <button type="button" className="tr-button-ghost" disabled={busy||!saved.enabled||dirty} onClick={run}>Prepare next eligible draft now</button></div>
  </fieldset>
  <p role="status" className="mt-3 text-sm">{message}</p>
 </section>;
}
