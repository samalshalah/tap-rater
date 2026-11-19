"use client";
import {useId,useMemo,useState} from 'react';
import {KeyRound,Gift,ShoppingBag} from 'lucide-react';
import {activateListRow} from './list-row-action';
import {formatOrderReference} from '@/lib/order-reference';
import type {CustomerPortalInvoice,CustomerPortalSubscription,CustomerPortalLicence} from '@/lib/customer-portal';
import {indexBillingInvoices,type BillingOrder,type Selection} from './billing-model';
import {Badge,date,money,subscriptionStatus} from './billing-display';
import {BillingDetailsDialog} from './billing-details-dialog';
export type {BillingOrder} from './billing-model';
export {money} from './billing-display';
export {LicenceDetails,SubscriptionDetails} from './billing-licence-details';
export {InvoiceDetails,OrderInvoiceAttachments} from './billing-invoice-details';
export function CustomerOrdersManager({orders,invoices,subscriptions,licences=[]}:{licences?:CustomerPortalLicence[];orders:BillingOrder[];invoices:CustomerPortalInvoice[];subscriptions:CustomerPortalSubscription[]}){
 const [selected,setSelected]=useState<Selection|null>(null);
 const headingId=useId();
 const invoiceIndex=useMemo(()=>indexBillingInvoices(orders,invoices),[orders,invoices]);

 return <>
  {orders.length>0&&<section id="invoices" aria-label="Stand orders" className="grid gap-3">
   <header><h2>Stand orders</h2><p className="mt-1 text-xs text-muted">Production, delivery and payment details for your physical stands.</p></header>
   <div role="list" className="grid gap-3">{orders.map(order=>{
    const documents=invoiceIndex.byOrder.get(order.id)||[];
    const itemLabel=order.items.map(item=>item.title).filter(Boolean).slice(0,2).join(', ');
    const reference=formatOrderReference(order.reference);
    return <article key={order.id} role="listitem" data-dashboard-row onClick={event=>activateListRow(event,()=>setSelected({kind:'order',value:order}))} className="tr-stand-row tr-card tr-order-row p-4">
     <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
       <div className="tr-stand-thumbnail flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white p-1">{order.paymentStatus==='complimentary'?<Gift size={22} className="text-muted" aria-hidden="true"/>:<ShoppingBag size={22} className="text-muted" aria-hidden="true"/>}</div>
       <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
         <h3 className="text-base font-medium text-ink"><button type="button" className="text-left hover:underline" aria-haspopup="dialog" aria-label={`Open order ${reference}`} onClick={()=>setSelected({kind:'order',value:order})}>{reference}</button></h3>
         <Badge status={order.paymentStatus||order.status}/>
        </div>
        <p className="mt-1 truncate text-xs text-muted">{date(order.createdAt)||'—'} · {order.itemCount} item{order.itemCount===1?'':'s'}{itemLabel&&<> · {itemLabel}</>}</p>
        <p className="mt-1 text-xs text-muted"><strong className="text-ink">{money(order.totalCents,order.currency)}</strong>{order.paymentStatus==='complimentary'&&<> · Replacement or complimentary · No charge</>}</p>
       </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
       {documents.map(invoice=><span key={invoice.id} className="contents"><button type="button" className="tr-button-ghost" onClick={()=>setSelected({kind:'invoice',value:invoice})}>{documents.length>1?`Invoice ${invoice.invoiceNumber||''}`:'View invoice'}</button>{invoice.invoicePdfUrl&&<a className="tr-button-ghost" href={`/api/account/orders/${order.id}/invoice`} aria-label={`Download invoice ${invoice.invoiceNumber||reference} PDF`}>Download PDF</a>}{invoice.receiptUrl&&<a className="tr-button-ghost" href={invoice.receiptUrl} target="_blank" rel="noreferrer">Receipt</a>}</span>)}
       <button type="button" className="tr-button-primary" onClick={()=>setSelected({kind:'order',value:order})}>View order</button>
      </div>
     </div>
    </article>;
   })}</div>
  </section>}
  {(licences.length>0||subscriptions.length>0)&&<section aria-label="Services and access" className="grid gap-3"><header><h2>Services &amp; access</h2><p className="mt-1 text-xs text-muted">Your service access and billing details.</p></header><div role="list" className="grid gap-3">{licences.map(licence=><article key={licence.id} role="listitem" data-dashboard-row onClick={event=>activateListRow(event,()=>setSelected({kind:'licence',value:licence}))} className="tr-stand-row tr-card tr-access-row p-4"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="tr-stand-thumbnail flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white p-1"><KeyRound size={22} className="text-muted" aria-hidden="true"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-medium text-ink">{licence.title}</h3><Badge status={licence.expiresAt&&Date.parse(licence.expiresAt)<=Date.now()?'expired':licence.status}/></div><p className="mt-1 text-xs text-muted">{licence.locationLimit===undefined?'Unlimited locations':`${licence.locationLimit} location${licence.locationLimit===1?'':'s'}`} · {licence.source==='manual'?'Granted by admin · no charge':'Test access'}</p></div></div><div className="flex shrink-0 flex-wrap items-center gap-2"><button type="button" className="tr-button-primary" onClick={()=>setSelected({kind:'licence',value:licence})}>View access</button></div></div></article>)}{subscriptions.map(subscription=><article key={subscription.id} role="listitem" data-dashboard-row onClick={event=>activateListRow(event,()=>setSelected({kind:'subscription',value:subscription}))} className="tr-stand-row tr-card tr-access-row p-4"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="tr-stand-thumbnail flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white p-1"><KeyRound size={22} className="text-muted" aria-hidden="true"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-medium text-ink">Multi-Link</h3><Badge status={subscriptionStatus(subscription)}/></div><p className="mt-1 text-xs text-muted">1 page · {subscription.source==='admin'?'Granted by admin · no charge':subscription.source==='manual'?'Managed by Tap Rater':'Subscription'}</p></div></div><div className="flex shrink-0 flex-wrap items-center gap-2"><button type="button" className="tr-button-primary" onClick={()=>setSelected({kind:'subscription',value:subscription})}>View access</button></div></div></article>)}</div></section>}
  {!orders.length&&!licences.length&&!subscriptions.length&&<p className="rounded-md border border-dashed border-line bg-white p-5 text-sm text-muted">No stand orders yet.</p>}
  {!!invoiceIndex.other.length&&<details className="rounded-md border border-line bg-white p-4"><summary className="cursor-pointer text-sm font-medium">Other invoices</summary><div className="mt-3 divide-y divide-line">{invoiceIndex.other.map(invoice=><div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{invoice.invoiceNumber||'Invoice'} · {date(invoice.issuedAt)}</span><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'invoice',value:invoice})}>View invoice</button></div>)}</div></details>}
  {selected&&<BillingDetailsDialog selected={selected} setSelected={setSelected} headingId={headingId} invoices={selected.kind==='order'?invoiceIndex.byOrder.get(selected.value.id)||[]:invoices}/>}
 </>;
}
