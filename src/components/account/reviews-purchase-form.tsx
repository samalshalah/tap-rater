'use client';
import {useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {marketingAmount,marketingPlan} from '@/lib/marketing-plan';

/** Rendered only behind the server-side Reviews sales gate. */
export function ReviewsPurchaseForm({guest=false}:{guest?:boolean}){
 const [locations,setLocations]=useState(1),[name,setName]=useState(''),[email,setEmail]=useState('');
 const [accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const attempt=useRef<{selection:string;id:string}|null>(null);
 async function purchase(event:FormEvent){
  event.preventDefault();if(busy||!accepted)return;setBusy(true);setError('');
  const selection=JSON.stringify({locations,email:guest?email.trim().toLowerCase():''});
  try{
   if(attempt.current?.selection!==selection){
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(selection));
    const key='reviews-checkout:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    let id=crypto.randomUUID();
    // Keep the same attempt after returning from Stripe or refreshing. Store no contact details.
    try{
     const saved=JSON.parse(sessionStorage.getItem(key)||'null');
     if(saved?.expires>Date.now()&&typeof saved.id==='string')id=saved.id;
     else sessionStorage.setItem(key,JSON.stringify({id,expires:Date.now()+3600000}));
    }catch{/* Checkout remains usable when browser storage is unavailable. */}
    attempt.current={selection,id};
   }
   const response=await fetch('/api/account/marketing-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attempt:attempt.current.id,cadence:'month',locations,acceptedTerms:true,...(guest?{name:name.trim(),email:email.trim()}: {})})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Checkout is unavailable. Please try again.');
   if(!result.url)throw Error('Checkout did not open. Please try again.');
   window.location.assign(result.url);
  }catch(e){setError(e instanceof Error?e.message:'Checkout is unavailable. Please try again.');setBusy(false);}
 }
 return <form onSubmit={purchase} className="space-y-4" aria-label="Google Reviews package">
  <h2 className="text-xl font-semibold">Google Reviews</h2>
  <p><strong>$29 per location / month</strong>. {marketingPlan.replies.toLocaleString('en-US')} AI reply generations per location each month, review imports, editable replies, and optional 4–5-star autopilot.</p>
  <p className="text-sm text-muted">Connect a Google Business Profile you own or manage after payment. AI and automatic posting start off. Autopilot requires your separate opt-in and can include older unanswered reviews. 1–3-star replies stay as drafts for manual submission. Google Growth is not included.</p>
  <fieldset disabled={busy} className="space-y-4">
   {guest&&<><label className="block text-sm">Full name<input required maxLength={150} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded border border-line p-3"/></label><label className="block text-sm">Email<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded border border-line p-3"/></label><p className="text-sm">Already have an account? <Link href="/account/login" className="underline">Sign in before subscribing</Link>.</p></>}
   <label className="block text-sm">Locations<select value={locations} onChange={e=>setLocations(Number(e.target.value))} className="ml-3 rounded border border-line p-2">{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
   <p className="font-semibold">${(marketingAmount({cadence:'month',locations})/100).toFixed(2)} / month</p>
   <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required className="mt-1"/><span>I agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy-policy" className="underline">Privacy Policy</Link>, and authorize this monthly subscription to renew until canceled. I can cancel future renewals in Subscription management.</span></label>
   <button type="submit" disabled={!accepted||busy} className="tr-button-primary">{busy?'Opening secure checkout…':'Continue to secure payment'}</button>
  </fieldset>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </form>;
}
