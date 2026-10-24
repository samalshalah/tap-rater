'use client';
import {useState} from 'react';
type Draft={summary:string;steps:string[];proposedDescription:string;questions:string[]};
export function IssueDraftEditor({draft,busy,allowDescription,onSave}:{draft:Draft;busy:boolean;allowDescription:boolean;onSave:(draft:Draft,expectedDraft:Draft)=>Promise<boolean>}){
 const [editing,setEditing]=useState(false),[pending,setPending]=useState(draft),[original,setOriginal]=useState(draft);
 if(!editing)return <button type="button" className="tr-button-ghost mt-4" disabled={busy} onClick={()=>{setOriginal(draft);setPending({...draft,steps:[...draft.steps],questions:[...draft.questions]});setEditing(true);}}>Edit draft</button>;
 const valid=pending.summary.trim().length>=10&&pending.steps.length>0&&pending.steps.every(s=>s.trim().length>=25)&&pending.questions.every(q=>q.trim().length>0);
 return <form className="mt-4 space-y-3 rounded-lg border border-line bg-white p-3" onSubmit={async e=>{e.preventDefault();if(valid&&await onSave(pending,original))setEditing(false);}}>
  <label className="block text-sm">Summary<textarea className="mt-1 w-full rounded border border-line p-2" rows={3} maxLength={1200} required minLength={10} disabled={busy} value={pending.summary} onChange={e=>setPending({...pending,summary:e.target.value})}/></label>
  {pending.steps.map((step,n)=><label key={n} className="block text-sm">Step {n+1}<textarea className="mt-1 w-full rounded border border-line p-2" rows={2} maxLength={600} minLength={25} required disabled={busy} value={step} onChange={e=>setPending({...pending,steps:pending.steps.map((s,k)=>k===n?e.target.value:s)})}/><button type="button" className="text-xs underline" disabled={busy||pending.steps.length===1} onClick={()=>setPending({...pending,steps:pending.steps.filter((_,k)=>k!==n)})}>Remove step {n+1}</button></label>)}
  <button type="button" className="tr-button-ghost" disabled={busy||pending.steps.length>=6} onClick={()=>setPending({...pending,steps:[...pending.steps,'']})}>Add step</button>
  {allowDescription&&<label className="block text-sm">Proposed description<textarea className="mt-1 w-full rounded border border-line p-2" rows={4} maxLength={750} disabled={busy} value={pending.proposedDescription} onChange={e=>setPending({...pending,proposedDescription:e.target.value})}/></label>}
  {pending.questions.map((q,n)=><label key={n} className="block text-sm">Question {n+1}<textarea className="mt-1 w-full rounded border border-line p-2" rows={2} maxLength={400} required disabled={busy} value={q} onChange={e=>setPending({...pending,questions:pending.questions.map((s,k)=>k===n?e.target.value:s)})}/><button type="button" className="text-xs underline" disabled={busy} onClick={()=>setPending({...pending,questions:pending.questions.filter((_,k)=>k!==n)})}>Remove question {n+1}</button></label>)}
  <button type="button" className="tr-button-ghost" disabled={busy||pending.questions.length>=6} onClick={()=>setPending({...pending,questions:[...pending.questions,'']})}>Add question</button>
  <div className="flex gap-2"><button className="tr-button-primary" disabled={busy||!valid}>{busy?'Saving…':'Save draft edits'}</button><button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>setEditing(false)}>Cancel edits</button></div>
  <p className="text-xs text-muted">Saves this draft only. Nothing is published.</p>
 </form>;
}
