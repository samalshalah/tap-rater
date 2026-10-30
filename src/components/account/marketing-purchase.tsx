"use client";
import {useEffect,useState} from "react";
export function MarketingPurchaseCard({guest=false}:{available:boolean;guest?:boolean}){
 const [subscription,setSubscription]=useState<{status:string;locations:number;cancel_at_period_end:boolean}|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{if(guest){setLoading(false);return;}let active=true;fetch('/api/account/marketing-subscription',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Could not load subscription status.');return r.json();}).then(d=>{if(active)setSubscription(d.subscription??null);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[guest]);
 async function manage(){setBusy(true);setError("");try{const r=await fetch('/api/account/marketing-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'portal'})});const d=await r.json();if(!r.ok)throw Error(d.error||'Billing management is unavailable.');if(d.url)window.location.assign(d.url);}catch(e){setError(e instanceof Error?e.message:'Billing management is unavailable.');}finally{setBusy(false);}}
 return <section className="tr-card max-w-2xl space-y-4 p-5">
 {loading?<p role="status">Loading subscription...</p>:subscription?<><h2 className="text-xl font-semibold">Your existing subscription</h2><p>{subscription.locations} location(s) · {subscription.status}{subscription.cancel_at_period_end?' · Renewal canceled':''}</p><button className="tr-button-primary" disabled={busy} onClick={manage}>{busy?'Opening billing...':'Manage subscription & invoices'}</button></>:<p>No service subscription to manage.</p>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
