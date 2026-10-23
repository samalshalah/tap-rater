'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {marketingAmount} from '@/lib/marketing-plan';
export function MarketingPurchaseCard({available,guest=false}:{available:boolean;guest?:boolean}){
 const cadence='month' as const;
 const [locations,setLocations]=useState(1),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[subscription,setSubscription]=useState<{status:string;cadence:string;locations:number;cancel_at_period_end:boolean}|null>(null);
 const [email,setEmail]=useState(''),[name,setName]=useState('');
 useEffect(()=>{if(!guest)fetch('/api/account/marketing-subscription',{cache:'no-store'}).then(r=>r.json()).then(d=>setSubscription(d.subscription??null)).catch(()=>setError('Could not load subscription status.'));},[guest]);
 async function action(kind:'checkout'|'portal'|'register'){
  setBusy(true);setError('');try{
   let attempt=sessionStorage.getItem(`growth-attempt:${cadence}:${locations}`);if(!attempt){attempt=crypto.randomUUID();sessionStorage.setItem(`growth-attempt:${cadence}:${locations}`,attempt);}
   const r=await fetch(kind==='register'?'/api/account/register':'/api/account/marketing-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(kind==='register'?{email,name}:kind==='portal'?{action:'portal'}:{cadence,locations,acceptedTerms:accepted,attempt,...(guest?{email,name}:{})})});const d=await r.json();if(!r.ok)throw Error(d.error||'Please try again.');
   if(d.url)window.location.assign(d.url);else setError('Check your email to activate your account, then sign in to purchase your package.');
  }catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}
 }
 return <section className="tr-card max-w-2xl space-y-4 p-5"><h2 className="text-xl font-semibold">Tap Rater Growth</h2><p>Google review replies, profile improvements and local ranking insights—prepared for your approval.</p>
 <ul className="list-disc space-y-1 pl-5 text-sm"><li>300 AI review reply drafts per location each month</li><li>10 GBP AI improvement drafts per location each month</li><li>3 keywords · 7×7 heat maps · 4 ranking updates per month</li><li>Competitor comparison, reports and spam flags</li><li>Replies and profile changes stay as drafts. Directory distribution is not included.</li></ul>
 {subscription&&!['checkout','canceled','incomplete_expired'].includes(subscription.status)?<><p>{subscription.locations} location(s) · {subscription.status} · Monthly{subscription.cancel_at_period_end?' · Renewal canceled':''}</p><button className="tr-button-primary" disabled={busy} onClick={()=>action('portal')}>Manage subscription & invoices</button></>:<>
 <fieldset disabled={busy} className="grid gap-3"><p>$29 per location / month</p><label>Locations <input className="tr-input" type="number" min={1} max={10} value={locations} onChange={e=>setLocations(Number(e.target.value))}/></label><p className="font-semibold">${(marketingAmount({cadence,locations})/100).toFixed(2)} / month</p>
 <p className="text-sm">Renews automatically until canceled. Cancel future renewals in your account. Monthly allowances reset each calendar month. Regenerations count toward allowances.</p>
 {guest&&<><label>Name<input className="tr-input" value={name} onChange={e=>setName(e.target.value)}/></label><label>Email<input className="tr-input" type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><p className="text-sm">Pay first. We’ll email your activation link after payment is confirmed.</p><Link href="/account/login" className="underline">Already a customer? Sign in</Link></>}
 <label className="text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> I agree to the recurring price and <Link href="/terms" className="underline">terms</Link>.</label><button className="tr-button-primary" disabled={!available||!accepted||locations<1||locations>10||(guest&&(!email||!name))} onClick={()=>action('checkout')}>{busy?'Opening secure checkout…':'Continue to payment'}</button>
 </fieldset>{!available&&<p className="text-sm">Purchasing is being prepared. No payment will be taken yet.</p>}</>}
 {error&&<p role="status">{error}</p>}<p className="text-sm"><Link href="/shop" className="underline">Buying a Google stand?</Link> Add Growth at checkout. The stand is a separate one-time purchase.</p></section>;
}
