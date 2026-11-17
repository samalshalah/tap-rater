'use client';

import {useEffect,useState} from 'react';

import Link from 'next/link';

import {ModalDialog} from '@/components/ui/modal-dialog';



type Choice={kind:'locations'|'cancel'|'keep';removedIds:string[];unusedToRemove?:number};

type Location={id:string;name:string;address:string;removing:boolean};

type Snapshot={selfServe:boolean;reason?:string;quantity?:number;currency?:string;subtotal?:number;nextQuantity?:number;nextSubtotal?:number;periodEnd?:string;cancelling?:boolean;locations?:Location[];pendingIds?:string[];pendingUnused?:number;unused?:number;retry?:{operationId:string;choice:Choice;token:string}};

type Preview={token:string;kind:Choice['kind'];removedIds:string[];unusedToRemove?:number;currentQuantity:number;nextQuantity:number;currentSubtotal:number;nextSubtotal:number;currency:string;effectiveAt:string};

const money=(n:number,currency='usd')=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(n/100);

const date=(value:string)=>new Date(value).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});

async function api(body?:unknown){const r=await fetch('/api/account/reviews-plan',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Billing is temporarily unavailable.');return data;}

export function ReviewsBillingPlan(){

 const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');

 const [confirmation,setConfirmation]=useState<{choice:Choice;preview:Preview;operationId:string}|null>(null);

 async function refresh(){setData(await api());}

 useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);

 async function preview(choice:Choice){setBusy(true);setError('');try{const result=await api({action:'preview',choice});setConfirmation({choice,preview:result,operationId:crypto.randomUUID()});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}

 async function confirm(request:{choice:Choice;token:string;operationId:string}){setBusy(true);setError('');try{await api({action:'confirm',request});setConfirmation(null);await refresh();setNotice('Your plan has been updated. Your current service continues until the date shown.');}catch(e){setError((e as Error).message);try{await refresh();}catch{}}finally{setBusy(false);}}

 const pending=data?.pendingIds||[],unusedPending=data?.pendingUnused||0;

 return <section className="tr-reviews-billing-plan">

  <header><h2>Google Reviews plan</h2><p>Manage paid locations and renewal. Pause service separately in <Link href="/account/locations?location=">Locations</Link>.</p></header>

  {notice&&<p role="status" className="tr-billing-notice">{notice}</p>}

  {error&&!confirmation&&<p role="alert">{error} <button disabled={busy} onClick={()=>{setError('');refresh().catch(e=>setError(e.message));}}>Refresh billing</button></p>}

  {!data&&!error&&<p role="status">Loading billing details…</p>}

  {data?.quantity!=null&&<div className="tr-billing-summary"><div><span>Paid locations</span><strong>{data.quantity}</strong></div><div><span>Monthly subtotal</span><strong>{money(data.subtotal!,data.currency)}</strong></div><div><span>{data.cancelling?'Service ends':'Next renewal'}</span><strong>{date(data.periodEnd!)}</strong></div></div>}

  {data?.reason&&<p>{data.reason} <Link href="/contact-us">Contact support</Link></p>}

  {data?.selfServe&&<>

   <p className="tr-billing-next">{data.cancelling?`Your entire Reviews subscription ends on ${date(data.periodEnd!)}. It will not renew.`:`Next renewal: ${money(data.nextSubtotal!,data.currency)} per month for ${data.nextQuantity} ${data.nextQuantity===1?'location':'locations'}.`}</p>

   <p className="tr-billing-caption">Amounts are subscription subtotals. Applicable tax is added to your invoice. No charge or credit is made today.</p>

   {data.retry?<div role="alert"><p>A billing change needs to finish. Retry it before making another change.</p><button className="tr-button-primary" disabled={busy} onClick={()=>confirm(data.retry!)}>Retry saved change</button></div>:<>

    <h3>Manage paid locations</h3>

    <div className="tr-client-table-wrap"><table className="tr-client-table tr-billing-locations"><thead><tr><th>Business</th><th>Plan status</th><th>Action</th></tr></thead><tbody>

     {(data.locations||[]).map(location=><tr key={location.id}><th scope="row">{location.name}<small>{location.address}</small></th><td data-label="Plan status">{data.cancelling||location.removing?`Ends ${date(data.periodEnd!)}`:'Included in your plan'}</td><td data-label="Action">{!data.cancelling&&(location.removing?<button className="tr-button-ghost" disabled={busy} onClick={()=>preview({kind:'locations',removedIds:pending.filter(id=>id!==location.id),unusedToRemove:unusedPending})}>Keep location</button>:<button className="tr-button-ghost" disabled={busy} onClick={()=>preview({kind:data.nextQuantity===1?'cancel':'locations',removedIds:data.nextQuantity===1?[]:[...pending,location.id],unusedToRemove:data.nextQuantity===1?0:unusedPending})}>{data.nextQuantity===1?'Cancel entire subscription':'Remove from plan'}</button>)}</td></tr>)}

    </tbody></table></div>

    {!!data.unused&&!data.cancelling&&<div className="tr-billing-unused"><p>{data.unused} unused {data.unused===1?'licence':'licences'} · {unusedPending} scheduled for removal.</p><div>{data.unused>unusedPending&&<button className="tr-button-ghost" disabled={busy} onClick={()=>preview({kind:data.nextQuantity===1?'cancel':'locations',removedIds:data.nextQuantity===1?[]:pending,unusedToRemove:data.nextQuantity===1?0:unusedPending+1})}>{data.nextQuantity===1?'Cancel entire subscription':'Remove unused licence'}</button>}{unusedPending>0&&<button className="tr-button-ghost" disabled={busy} onClick={()=>preview({kind:'locations',removedIds:pending,unusedToRemove:0})}>Keep unused licences</button>}</div></div>}

    {!data.locations?.length&&<p>Your plan has {data.quantity} paid {data.quantity===1?'licence':'licences'}. Add a business in Locations to use them.</p>}

    <p className="tr-billing-caption">Removing a location takes effect at renewal. Its reviews and drafts stay saved. You can keep it on the plan again before that date.</p>

    <footer className="tr-billing-cancel"><div><h3>{data.cancelling?'Keep your subscription':'Cancel entire subscription'}</h3><p>{data.cancelling?'Restore renewal for all currently paid locations.':'End Google Reviews for every location on this subscription at the end of your paid period.'}</p></div><button className="tr-button-ghost" disabled={busy} onClick={()=>preview({kind:data.cancelling?'keep':'cancel',removedIds:[]})}>{data.cancelling?'Keep subscription':'Cancel entire subscription'}</button></footer>

   </>}

  </>}

  {confirmation&&<ModalDialog labelledBy="reviews-plan-confirm-title" onClose={()=>{if(!busy)setConfirmation(null);}}><div className="tr-card tr-billing-confirm"><h2 id="reviews-plan-confirm-title" data-dialog-heading tabIndex={-1}>{confirmation.choice.kind==='cancel'?'Cancel entire subscription?':confirmation.choice.kind==='keep'?'Keep your subscription?':'Confirm your location plan'}</h2>

   {confirmation.choice.kind==='cancel'?<p>Google Reviews for all {confirmation.preview.currentQuantity} paid {confirmation.preview.currentQuantity===1?'location':'locations'} will end on <strong>{date(confirmation.preview.effectiveAt)}</strong>. Your subscription will not renew. Any scheduled location removals are replaced by this cancellation.</p>:confirmation.choice.kind==='keep'?<p>Your subscription will renew on <strong>{date(confirmation.preview.effectiveAt)}</strong> for all currently paid locations.</p>:<><p>These locations will leave your plan on <strong>{date(confirmation.preview.effectiveAt)}</strong>:</p><ul>{confirmation.preview.removedIds.map(id=><li key={id}>{data?.locations?.find(l=>l.id===id)?.name}</li>)}</ul>{!!confirmation.preview.unusedToRemove&&<p>{confirmation.preview.unusedToRemove} unused licences will also be removed.</p>}{!confirmation.preview.removedIds.length&&!confirmation.preview.unusedToRemove&&<p>None. All your currently paid locations will stay on the plan.</p>}</>}

   <div className="tr-billing-confirm-total"><span>Next monthly subtotal</span><strong>{money(confirmation.preview.currentSubtotal,confirmation.preview.currency)} → {money(confirmation.preview.nextSubtotal,confirmation.preview.currency)}</strong></div>

   <p>Service continues through the paid period. Your saved reviews and drafts are kept. No charge or credit today; applicable tax is calculated on your invoice.</p>

   {error&&<p role="alert">{error}</p>}<footer><button className="tr-button-ghost" disabled={busy} onClick={()=>setConfirmation(null)}>Go back</button><button className="tr-button-primary" disabled={busy} onClick={()=>confirm({choice:confirmation.choice,token:confirmation.preview.token,operationId:confirmation.operationId})}>{busy?'Saving…':confirmation.choice.kind==='cancel'?'Confirm cancellation':'Confirm change'}</button></footer>

  </div></ModalDialog>}

 </section>;

}

