"use client";
import {useState} from 'react';
import type {CustomerPortalSubscription} from '@/lib/customer-portal';
import {date} from './billing-display';
import {MultiLinkForwardLink} from './multilink-forward-link';

/**
 * Lets the customer stop their Multi-Link page renewing (it stays live until the paid-through date),
 * or undo that. Ending early or refunds go through Tap Rater.
 */
export function MultiLinkRenewalControl({subscription}:{subscription:CustomerPortalSubscription}){
  const [canceling,setCanceling]=useState(subscription.cancelAtPeriodEnd);
  const [confirming,setConfirming]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  if(subscription.source!=='subscription')return null;
  const end=subscription.currentPeriodEnd?date(subscription.currentPeriodEnd):'the end of your current month';
  // An ended page cannot be renewed here, but the customer can still choose where the stand sends people.
  if(subscription.status==='canceled'||subscription.lifecycleStatus==='EXPIRED')return <section className="mt-5 grid gap-2 border-t border-line pt-4 text-sm" aria-label="After your page ended">
    <p className="text-ink">Your Multi-Link page has ended.</p>
    <MultiLinkForwardLink code={subscription.permanentCode} ended end={end}/>
  </section>;

  async function change(action:'cancel'|'keep'){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/account/hosted-page/subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:subscription.permanentCode,action})});
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(body?.error||'Your subscription couldn’t be changed. Try again.');
      setCanceling(action==='cancel');setConfirming(false);
    }catch(failure){setError(failure instanceof Error?failure.message:'Your subscription couldn’t be changed. Try again.');}
    finally{setBusy(false);}
  }

  return <section className="mt-5 grid gap-2 border-t border-line pt-4 text-sm" aria-label="Subscription renewal">
    {canceling
      ?<><p className="text-ink">Your subscription is canceled. Your page stays live until <strong>{end}</strong>, then shows “not active”. You won’t be charged again.</p>
        <div><button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>change('keep')}>{busy?'Saving…':'Keep my subscription'}</button></div>
        <MultiLinkForwardLink code={subscription.permanentCode} ended={false} end={end}/></>
      :confirming
        ?<><p className="text-ink">Cancel your $9.99/month Multi-Link subscription? Your page stays live until <strong>{end}</strong>, then your stand’s QR and NFC will show “not active”. You can undo this before then, and you can choose a link your stand sends people to after it ends.</p>
          <div className="flex flex-wrap gap-2"><button type="button" className="tr-button-primary bg-red-700 hover:bg-red-800" disabled={busy} onClick={()=>change('cancel')}>{busy?'Canceling…':'Yes, cancel subscription'}</button><button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>setConfirming(false)}>Keep it</button></div></>
        :<div><button type="button" className="tr-button-ghost text-red-700" onClick={()=>setConfirming(true)}>Cancel subscription</button></div>}
    {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
  </section>;
}
