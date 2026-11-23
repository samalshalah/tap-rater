"use client";
import {useCallback,useEffect,useState} from 'react';
import type {AdminMultiLinkLicence} from '@/lib/admin-multilink-licences';

const sourceLabel={admin:'Granted by admin',manual:'Set up by Tap Rater',subscription:'Paid subscription'} as const;

// Lists a client's Multi-Link licences; each one is removed on its own after a confirm.
export function MultiLinkLicenceList({customerId,refreshKey=0}:{customerId:string;refreshKey?:number}){
  const [licences,setLicences]=useState<AdminMultiLinkLicence[]|null>(null);
  const [error,setError]=useState('');
  const [confirming,setConfirming]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const load=useCallback(async()=>{
    setError('');
    try{const r=await fetch(`/api/admin/multilink-licences?customerId=${encodeURIComponent(customerId)}`);const body=await r.json();if(!r.ok)throw Error(body.error);setLicences(body.licences);}
    catch(e){setError(e instanceof Error?e.message:'Could not load licences.');}
  },[customerId]);
  useEffect(()=>{void load();},[load,refreshKey]);

  async function remove(code:string){
    setBusy(true);setMessage('');
    try{const r=await fetch('/api/admin/multilink-licences',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId,code})});const body=await r.json();if(!r.ok)throw Error(body.error);setMessage(`Removed licence ${code}.`);setConfirming(null);await load();}
    catch(e){setMessage(e instanceof Error?e.message:'Could not remove licence.');}
    finally{setBusy(false);}
  }

  return <section aria-label="Current Multi-Link licences" className="grid gap-2 text-sm">
    <h3 className="font-semibold">Current licences</h3>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    {!licences&&!error&&<p className="text-muted">Loading…</p>}
    {licences?.length===0&&<p className="text-muted">No Multi-Link licences on this account.</p>}
    {licences?.map(licence=><div key={licence.code} className="rounded-md border border-line p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink">{licence.businessName}</p>
          <p className="text-xs text-muted">{licence.code} · {sourceLabel[licence.source]} · {licence.published?'Published':'Not published'} · {licence.links} link{licence.links===1?'':'s'}</p>
        </div>
        {licence.removable
          ?confirming===licence.code
            ?null
            :<button type="button" className="tr-button-ghost text-red-700" disabled={busy} onClick={()=>{setConfirming(licence.code);setMessage('');}}>Remove</button>
          :<span className="text-xs text-muted">{licence.blockedReason}</span>}
      </div>
      {confirming===licence.code&&<div className="mt-3 grid gap-2 rounded-md bg-soft p-3">
        <p>Remove <strong>{licence.businessName}</strong> ({licence.code})? The page and its draft links are deleted and the client loses this licence. This can’t be undone.</p>
        <div className="flex gap-2"><button type="button" className="tr-button-primary" disabled={busy} onClick={()=>remove(licence.code)}>{busy?'Removing…':'Yes, remove'}</button><button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>setConfirming(null)}>Cancel</button></div>
      </div>}
    </div>)}
    {message&&<p role="status">{message}</p>}
  </section>;
}
