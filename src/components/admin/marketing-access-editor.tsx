'use client';
import {useEffect,useState} from 'react';
import {ModalDialog} from '@/components/ui/modal-dialog';
type Account={id:string;name:string;status:string|null;expires_at:string|null;version:number;location_limit:number;ai_monthly_limit:number;heatmap_monthly_points:number;locations:{id:string;enabled:boolean;aiUsed:number;pointsUsed:number}[]};
export function MarketingAccessEditor(){
 const [accounts,setAccounts]=useState<Account[]>([]),[selected,setSelected]=useState<Account|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await fetch('/api/admin/marketing-access',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);setAccounts(d.accounts);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function save(){if(!selected)return;setBusy(true);setError('');try{
  const r=await fetch('/api/admin/marketing-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId:selected.id,version:selected.version,status:selected.status||'inactive',expiresAt:selected.expires_at?new Date(selected.expires_at).toISOString():null,locationLimit:selected.location_limit,aiMonthlyLimit:selected.ai_monthly_limit,heatmapMonthlyPoints:selected.heatmap_monthly_points,enabledLocations:selected.locations.filter(l=>l.enabled).map(l=>l.id)})});
  const d=await r.json();if(!r.ok)throw Error(d.error);await load();setSelected(null);
 }catch(e){setError(e instanceof Error?e.message:'Save failed.');}finally{setBusy(false);}}
 return <details className="my-4 rounded-lg border border-line bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">Package access & enforced limits</summary>
 <p className="my-3 text-sm">Manual access only. Saving does not start billing or enable paid scans. AI allowances are shared by reviews and profile drafts per location, per calendar month.</p>
 {error&&<p role="alert" className="text-red-700">{error}</p>}
 <table className="tr-workspace-table w-full text-left text-sm"><thead><tr><th>Account</th><th>Access</th><th>Locations</th><th>Monthly AI / location</th><th>Monthly scan points / location</th><th/></tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.expires_at&&Date.parse(a.expires_at)<=Date.now()?'Expired':a.status||'Inactive'}</td><td>{a.locations.filter(l=>l.enabled).length}/{a.location_limit}</td><td>{a.ai_monthly_limit}</td><td>{a.heatmap_monthly_points}</td><td><button className="tr-button-ghost" onClick={()=>{setError('');setSelected(structuredClone(a));}}>Manage</button></td></tr>)}</tbody></table>
 {selected&&<ModalDialog labelledBy="access-title" onClose={()=>{if(!busy)setSelected(null);}}><div className="tr-listing-dialog"><h2 id="access-title" tabIndex={-1} data-dialog-heading>{selected.name} · Package access</h2><fieldset disabled={busy} className="my-4 grid gap-3">
 <label>Access <select value={selected.status||'inactive'} onChange={e=>setSelected({...selected,status:e.target.value})}><option value="inactive">Inactive</option><option value="testing">Testing</option><option value="active">Active · manual access</option></select></label>
 <label>Expires at <input type="datetime-local" value={selected.expires_at?new Date(Date.parse(selected.expires_at)-new Date(selected.expires_at).getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>setSelected({...selected,expires_at:e.target.value?new Date(e.target.value).toISOString():null})}/></label>
 {([['location_limit','Location allowance',1000],['ai_monthly_limit','Monthly AI attempts per location',100000],['heatmap_monthly_points','Monthly scan points per location',1000000]] as const).map(([key,label,max])=><label key={key}>{label} <input type="number" min={0} max={max} step={1} value={selected[key]} onChange={e=>setSelected({...selected,[key]:Number(e.target.value)})}/></label>)}
 {selected.locations.map((l,i)=><label key={l.id} className="text-sm"><input type="checkbox" checked={l.enabled} onChange={e=>setSelected({...selected,locations:selected.locations.map(x=>x.id===l.id?{...x,enabled:e.target.checked}:x)})}/> Location {i+1} · AI {l.aiUsed} · Scan points {l.pointsUsed}</label>)}
 <p className="text-xs text-muted">Zero blocks new usage. Failed AI attempts still count. Existing drafts and results are preserved. Uncheck locations before lowering the location allowance. Monthly limits reset in New York time.</p>
 <button className="tr-button-primary" onClick={save}>Save access & limits</button><button className="tr-button-ghost" onClick={()=>setSelected(null)}>Cancel</button></fieldset>{error&&<p role="alert">{error}</p>}</div></ModalDialog>}
 </details>;
}
