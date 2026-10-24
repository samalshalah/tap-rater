"use client";
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
export function CustomerProofReview({orderId,index,canApprove,onDone}:{orderId:string;index:number;canApprove:boolean;onDone:()=>void}){
 const [proof,setProof]=useState<{image:string;version:string;quantity:number}|null>(null),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false);const router=useRouter();
 const endpoint=`/api/account/orders/${orderId}/proof/${index}`;
 useEffect(()=>{let active=true;fetch(endpoint,{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);if(active)setProof(data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[endpoint]);
 async function approve(){if(!proof)return;setBusy(true);setError('');try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:proof.version,confirmed})}),data=await r.json();if(!r.ok)throw Error(data.error);router.refresh();onDone();}catch(e){setError(e instanceof Error?e.message:'Could not approve proof.');}finally{setBusy(false);}}
 return <div className="grid gap-4 p-5">{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{!proof&&!error&&<p role="status">Loading your proof…</p>}{proof&&<><img src={proof.image} alt="Your stand design proof" className="max-h-[55dvh] w-full object-contain"/>{canApprove&&<><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I approve this design for {proof.quantity} stand{proof.quantity===1?'':'s'} in this order item.</label><button className="tr-button-primary justify-self-end" disabled={!confirmed||busy} onClick={approve}>{busy?'Saving…':'Approve design'}</button></>}</>}</div>;
}
