"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import styles from './reviews-checkout.module.css';
import {ReviewsPurchaseForm} from './reviews-purchase-form';
type Subscription={status:string;locations:number;cancel_at_period_end:boolean;billingAvailable?:boolean};
const inactive=new Set(["checkout","canceled","cancelled","incomplete_expired"]);
function statusLabel(status:string){return ({active:"Active",trialing:"Trial",past_due:"Payment needs attention",incomplete:"Checkout not completed",incomplete_expired:"Checkout not completed",canceled:"Cancelled",cancelled:"Cancelled",unpaid:"Payment needs attention"} as Record<string,string>)[status]||status.replaceAll("_"," ");}
export function MarketingPurchaseCard({available,guest=false,serviceManaged=false,storefront=false,focused=false}:{available:boolean;guest?:boolean;serviceManaged?:boolean;storefront?:boolean;focused?:boolean}){
 const [subscription,setSubscription]=useState<Subscription|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{if(guest){setLoading(false);return;}let active=true;fetch('/api/account/marketing-subscription',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Could not load subscription status.');return r.json();}).then(d=>{if(active)setSubscription(d.subscription??null);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[guest]);
 async function manage(){setBusy(true);setError("");try{const r=await fetch('/api/account/marketing-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'portal'})});const d=await r.json();if(!r.ok)throw Error(d.error||'Billing management is unavailable.');if(d.url)window.location.assign(d.url);}catch(e){setError(e instanceof Error?e.message:'Billing management is unavailable.');}finally{setBusy(false);}}
 const purchasing=!loading&&!error&&available&&!serviceManaged&&(!subscription||inactive.has(subscription.status));
 return <section className={storefront?(purchasing?styles.card:styles.statusCard):"tr-card max-w-2xl space-y-4 p-5"}>
 {loading?<p role="status">Loading subscription...</p>:subscription&&!inactive.has(subscription.status)?<><h2 className="text-xl font-semibold">Google Reviews subscription</h2><p className="text-sm text-muted"><strong className="font-medium text-ink">{statusLabel(subscription.status)}</strong> · {subscription.locations} {subscription.locations===1?'location':'locations'}{subscription.cancel_at_period_end?' · Renewal canceled':''}</p>{subscription.billingAvailable===false&&<p className="text-sm text-muted">Need help finishing checkout? <Link href="/contact-us" className="underline">Contact support</Link> before starting another subscription.</p>}{subscription.billingAvailable!==false&&<button className="tr-button-primary" disabled={busy} onClick={manage}>{busy?'Opening billing...':'Manage subscription & invoices'}</button>}</>:serviceManaged?<><h2 className="text-xl font-semibold">Google Reviews access</h2><p className="text-sm text-muted">Your service is active and managed by Tap Rater. Contact support if you need to change your access.</p></>:!available?<><h2 className="text-xl font-semibold">No active subscription</h2><p className="text-sm text-muted">You do not have an active Google Reviews subscription to manage.</p></>:null}
 {!loading&&!error&&available&&!serviceManaged&&(!subscription||inactive.has(subscription.status))&&<ReviewsPurchaseForm guest={guest} focused={focused} setupHref={storefront&&!focused?'/google-reviews/setup':undefined}/>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
