"use client";
import {useState} from 'react';
import {LicenceDuration} from './licence-duration';
export function MultiLinkGrantForm({customerId}:{customerId:string}){
 const [name,setName]=useState(''),[expiry,setExpiry]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[requestId]=useState(()=>crypto.randomUUID()),[done,setDone]=useState(false);
 async function grant(){setBusy(true);setMessage('');try{const r=await fetch('/api/admin/multilink-grants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId,requestId,businessName:name,expiresAt:expiry})});const body=await r.json();if(!r.ok)throw Error(body.error);setDone(true);setMessage('Multi-Link licence granted. The client can edit their draft.');}catch(e){setMessage(e instanceof Error?e.message:'Could not grant licence.');}finally{setBusy(false);}}
 return <details className="mt-4 border-t border-line pt-3"><summary className="cursor-pointer text-sm font-semibold">Grant Multi-Link licence</summary><fieldset disabled={busy||done} className="mt-3 grid gap-3 text-sm"><label>Business name<input className="tr-input" value={name} onChange={e=>setName(e.target.value)}/></label><LicenceDuration value={expiry} onChange={setExpiry}/><button type="button" className="tr-button-primary" disabled={name.trim().length<2} onClick={grant}>Grant licence</button></fieldset>{message&&<p role="status" className="mt-2 text-sm">{message}</p>}</details>;
}
