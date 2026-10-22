'use client';
import {useEffect,useRef,useState} from 'react';
import {modelPlan,proposedPlans,type PlanInputs} from '@/lib/usage-plan-model';
import {scenarioVersion,type SavedScenario} from '@/lib/pricing-scenarios';
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export function SavedPricingScenarios({plans,valid,locations,onLoad}:{plans:PlanInputs[];valid:boolean;locations:number;onLoad:(p:PlanInputs[])=>void}){
 const [saved,setSaved]=useState<SavedScenario[]>([]),[name,setName]=useState(''),[first,setFirst]=useState(''),[second,setSecond]=useState('');
 const [busy,setBusy]=useState(false),[ready,setReady]=useState(false),[message,setMessage]=useState('');
 const pending=useRef<{key:string;id:string}|null>(null);
 async function refresh(){
  const r=await fetch('/api/admin/pricing-scenarios',{cache:'no-store'});const data=await r.json();
  if(!r.ok)throw new Error(data.error||'Unable to load scenarios.');
  setSaved(data.scenarios);setReady(true);return data.scenarios as SavedScenario[];
 }
 useEffect(()=>{refresh().catch(()=>setMessage('Saved scenarios unavailable. Retry loading; unsaved planning still works.'));},[]);
 async function save(){
  if(!valid||!name.trim()||busy)return;
  setBusy(true);setMessage('');
  const key=JSON.stringify({name:name.trim(),plans});
  if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()};
  try{
   const r=await fetch('/api/admin/pricing-scenarios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pending.current.id,name:name.trim(),plans,modelVersion:scenarioVersion})});
   const data=await r.json();if(!r.ok)throw new Error(data.error||'Save failed.');
   setFirst(data.id);await refresh();setMessage('Scenario saved. Live pricing and client limits are unchanged.');
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to save. Retry safely.');}
  finally{setBusy(false);}
 }
 const a=saved.find(s=>s.id===first),b=saved.find(s=>s.id===second);
 const compatible=(s:SavedScenario)=>s.modelVersion===scenarioVersion;
 return <section className="mt-3 rounded border border-line bg-slate-50 p-3 text-xs">
 <h4 className="font-semibold">Saved pricing scenarios</h4>
 <p className="mt-1 text-muted">Named snapshots of all three plans, shared within admin. No client names, location IDs, usage, or content are stored. Saving never activates pricing. Save a new name to keep another version.</p>
 <div className="mt-2 flex flex-wrap items-center gap-2"><label>Scenario name <input aria-label="Scenario name" maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Launch baseline" className="ml-1 rounded border border-line p-2"/></label><button type="button" disabled={!valid||!name.trim()||busy} onClick={save} className="rounded border border-line bg-white px-3 py-2 font-semibold disabled:opacity-50">{busy?'Saving…':'Save scenario'}</button><button type="button" disabled={busy} onClick={()=>{setMessage('');refresh().catch(()=>setMessage('Saved scenarios unavailable. Please retry.'));}} className="rounded border border-line bg-white px-3 py-2">Reload saved scenarios</button></div>
 <p role="status" className="mt-2">{message}</p>
 {ready&&!saved.length&&<p>No saved scenarios yet.</p>}
 {saved.length>0&&<><div className="mt-2 flex flex-wrap items-center gap-2"><label>Saved scenario <select aria-label="Saved scenario" value={first} onChange={e=>setFirst(e.target.value)} className="ml-1 rounded border border-line p-2"><option value="">Choose a scenario</option>{saved.map(s=><option key={s.id} value={s.id}>{s.name} · {new Date(s.createdAt).toLocaleString()}</option>)}</select></label><button type="button" disabled={!a||!compatible(a)||busy} onClick={()=>{if(a){onLoad(a.plans);setName(a.name);setMessage('Loaded into the editor only. Saved snapshot and live settings are unchanged.');}}} className="rounded border border-line bg-white px-3 py-2 disabled:opacity-50">Load into editor</button><label>Compare with <select aria-label="Compare saved scenario" value={second} onChange={e=>setSecond(e.target.value)} className="ml-1 rounded border border-line p-2"><option value="">Choose another scenario</option>{saved.map(s=><option key={s.id} value={s.id}>{s.name} · {new Date(s.createdAt).toLocaleString()}</option>)}</select></label></div>
 <p className="mt-2 text-muted">Latest 100 snapshots. Model version {scenarioVersion} freezes the provider rates, scan allowances, hosting allocation and fee assumptions used here. Comparison uses {locations} current locations of the selected account, not historical costs or actual profit.</p>
 {a&&b&&(compatible(a)&&compatible(b)?locations>0&&locations<=10?<div className="mt-2 overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Saved scenario comparison</caption><thead><tr>{['Plan','Scenario','Revenue','Modeled cost','Contribution','Margin'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{proposedPlans.flatMap((p,i)=>[a,b].map((s,j)=>{const m=modelPlan(i,locations,s.plans[i]);return m?<tr key={`${i}-${j}`} className="border-t border-line"><td className="p-2">{p.name}</td><td className="p-2">{s.name}</td>{[m.revenue,m.cost,m.contribution].map((v,k)=><td key={k} className="p-2">{money(v)}</td>)}<td className="p-2">{m.margin===null?'N/A':`${(m.margin*100).toFixed(1)}%`}</td></tr>:null;}))}</tbody></table></div>:<p>Comparison requires 1–10 current locations.</p>:<p>These snapshots use an unsupported model version and cannot be recalculated here.</p>)}
 </>}
 </section>;
}
