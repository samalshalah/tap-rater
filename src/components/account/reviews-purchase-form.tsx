'use client';
import {useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import styles from './reviews-checkout.module.css';
import {marketingAmount,marketingPlan} from '@/lib/marketing-plan';
import {ReviewsBusinessPreview,type PurchasePreview} from './reviews-business-preview';

/** Rendered only behind the server-side Reviews sales gate. */
export function ReviewsPurchaseForm({guest=false,focused=false,setupHref}:{guest?:boolean;focused?:boolean;setupHref?:string}){
 const [locations,setLocations]=useState(1),[email,setEmail]=useState(''),[preview,setPreview]=useState<PurchasePreview|null>(null);
 const [accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [stage,setStage]=useState(0);
 const [firstName,setFirstName]=useState(''),[lastName,setLastName]=useState(''),[phone,setPhone]=useState('');
 // Buyers who cannot (or prefer not to) connect Google yet can pay first and connect after activation.
 const [connectLater,setConnectLater]=useState(false);
 const planReady=Boolean(preview)||connectLater;
 // A business already in a Tap Rater workspace cannot be bought again, so never offer to pay around that check.
 const [assigned,setAssigned]=useState(false);
 const attempt=useRef<{selection:string;id:string;key:string}|null>(null);
 async function purchase(event:FormEvent){
  event.preventDefault();if(busy||!accepted||!planReady)return;setBusy(true);setError('');
  const selection=JSON.stringify({preview:preview?.id??'later',locations,email:guest?email.trim().toLowerCase():''});
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
    attempt.current={selection,id,key};
   }
   const response=await fetch('/api/account/marketing-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attempt:attempt.current.id,...(preview?{previewId:preview.id}:{}),cadence:'month',locations,acceptedTerms:true,...(guest?{email:email.trim(),firstName:firstName.trim(),lastName:lastName.trim(),phone:phone.trim()}: {})})});
   const result=await response.json();
   if(!response.ok){
    // The server has confirmed this attempt is terminal; never reset on ambiguous network failures.
    if(result.error==='Start a new purchase attempt.'){
     try{sessionStorage.removeItem(attempt.current.key);}catch{/* Storage may be unavailable. */}
     attempt.current=null;
     throw Error('Your previous checkout has ended. Select Continue to checkout to try again.');
    }
    throw Error(result.error||'Checkout is unavailable. Please try again.');
   }
   if(!result.url)throw Error('Checkout did not open. Please try again.');
   window.location.assign(result.url);
  }catch(e){setError(e instanceof Error?e.message:'Checkout is unavailable. Please try again.');setBusy(false);}
 }
 return <><ol className={focused?styles.flowSteps:styles.hiddenSteps} aria-label="Setup progress">{['Business','Connect','Analysis','Plan'].map((label,i)=><li key={label} aria-current={(planReady?3:stage)===i?'step':undefined} data-complete={i<(planReady?3:stage)}><span>{i<(planReady?3:stage)?'\u2713':i+1}</span>{label}</li>)}</ol><form onSubmit={purchase} className={`${styles.form} ${focused||planReady?styles.focusedForm:''} ${planReady?styles.planForm:''}`} aria-label="Google Reviews package">
  {(!focused&&!planReady)&&<aside className={styles.plan}>
   <span className={styles.eyebrow}>GOOGLE REVIEWS</span>
   <h2>Spend less time writing review replies</h2>
   <p className={styles.price}><strong>$29</strong><span>per location<br/>per month</span></p>
   <ul className={styles.features}><li>Your Google reviews, organised in one place</li><li>Reply drafts you can personalise</li><li>Edit, copy, and publish on Google when ready</li></ul>
   <p className={styles.limit}>{marketingPlan.replies.toLocaleString('en-US')} reply drafts per location each month</p>
   <p className={styles.limit}>You choose what to publish on Google yourself.</p>
  </aside>}
  <fieldset disabled={busy} className={styles.details}>
   {!planReady?<><ReviewsBusinessPreview setupHref={setupHref} onStage={setStage} onAssigned={setAssigned} onReady={setPreview} onChange={()=>{setAccepted(false);setError('');}}/>{!setupHref&&!assigned&&<p className={styles.smallPrint}>Can't connect Google right now? <button type="button" className={styles.textButton} onClick={()=>{setConnectLater(true);setAccepted(false);setError('');}}>Subscribe now and connect Google after payment</button></p>}</>:<>
   <div className={styles.detailsHeading}><h2>Your plan</h2>{guest&&<p>Have an account? <Link href="/account/login">Sign in</Link></p>}</div>
   {preview?<div className={styles.selectedBusiness}><strong>{preview.name}</strong><span>{preview.address}</span></div>:<div className={styles.selectedBusiness}><strong>Connect Google after payment</strong><span>After you activate your account, add your business in Locations and connect the Google account that manages it.</span></div>}
   {guest&&<div className={styles.fields}><div className={styles.profileNames}><label>First name<input required type="text" maxLength={50} autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)}/></label><label>Last name<input required type="text" maxLength={50} autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)}/></label></div><label>Email address<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Phone <span className={styles.optional}>(optional)</span><input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label><p className={styles.smallPrint}>We’ll send your account activation link to your email. Your selected business will be saved for setup.</p></div>}
   <div className={styles.locationRow}><label htmlFor="reviews-locations">How many locations do you want to subscribe?<span>$29 per location / month</span></label><select id="reviews-locations" value={locations} onChange={e=>setLocations(Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></div>
   {locations>1&&<p className={styles.smallPrint}>{preview?'Your selected business is location 1. ':''} {preview?'Add your other locations after activation.':'Add your locations after activation.'} Your subscription includes all selected locations from the date of payment.</p>}
   <div className={styles.total}><span>Monthly total<small>Renews monthly until canceled</small></span><strong>${(marketingAmount({cadence:'month',locations})/100).toFixed(2)}</strong></div>
   <p className={styles.planIncludes}>Review imports · {marketingPlan.replies.toLocaleString('en-US')} reply drafts per location/month. Submit replies to Google in one click, with optional 4–5-star autopilot. Each licence stays with its location for the paid period, even if removed. Change locations after renewal.</p>
   <label className={styles.consent}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy-policy">Privacy Policy</Link>. Renews monthly until canceled. If you cancel, service continues until the end of the paid month, then stops. No refunds for unused days.</span></label>
   <button type="submit" disabled={!accepted||busy} className={`tr-button-primary ${styles.submit}`}>{busy?'Opening secure checkout…':'Continue to secure checkout'}<span aria-hidden="true">→</span></button>
   <p className={styles.paymentNote}>Secure payment with Stripe · Cancel future renewals anytime</p>
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   <button type="button" className={styles.textButton} onClick={()=>{setPreview(null);setConnectLater(false);}}>{preview?'Back to review analysis':'Back to find your business'}</button>
   </>}
  </fieldset>
 </form></>;
}
