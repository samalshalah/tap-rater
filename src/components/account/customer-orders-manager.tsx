"use client";
import {useId,useMemo,useState} from 'react';
import {KeyRound,Gift} from 'lucide-react';
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
  {orders.length>0&&<section id="invoices" aria-label="Stand orders" className="overflow-hidden rounded-md border border-line bg-white">
   <header className="border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">Stand orders</h2><p className="mt-1 text-xs text-muted">Production, delivery and payment details for your physical stands.</p></header>
   <div className="tr-client-table-wrap overflow-x-auto">
   <table className="tr-client-table w-full min-w-[700px] text-left text-sm">
    <thead className="border-b border-line bg-soft text-xs text-muted"><tr>{['Order','Date','Items','Status','Total','Actions'].map(label=><th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
    <tbody className="divide-y divide-line">{orders.map(order=>{
     const documents=invoiceIndex.byOrder.get(order.id)||[];
     const itemLabel=order.items.map(item=>item.title).filter(Boolean).slice(0,2).join(', ');
     return <tr key={order.id} data-dashboard-row onClick={event=>activateListRow(event,()=>setSelected({kind:'order',value:order}))}><th scope="row" className="px-4 py-4 font-medium">{formatOrderReference(order.reference)}{order.paymentStatus==='complimentary'&&<span className="mt-1 flex items-center gap-1 text-xs text-muted"><Gift size={13}/>Replacement or complimentary · No charge</span>}</th><td className="whitespace-nowrap px-4 py-4 text-muted">{date(order.createdAt)||'—'}</td><td className="px-4 py-4"><span>{order.itemCount}</span>{itemLabel&&<span className="mt-1 block max-w-48 truncate text-xs text-muted">{itemLabel}</span>}</td><td className="px-4 py-4"><Badge status={order.paymentStatus||order.status}/></td><td className="whitespace-nowrap px-4 py-4">{money(order.totalCents,order.currency)}</td><td className="px-4 py-3"><div className="flex flex-wrap items-center gap-x-4 gap-y-2"><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'order',value:order})}>View order</button>{documents.map(invoice=><span key={invoice.id} className="inline-flex flex-wrap items-center gap-x-4 gap-y-2"><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'invoice',value:invoice})}>{documents.length>1?`Invoice ${invoice.invoiceNumber||''}`:'View invoice'}</button>{invoice.invoicePdfUrl&&<a className="text-brand hover:underline" href={`/api/account/orders/${order.id}/invoice`} aria-label={`Download invoice ${invoice.invoiceNumber||formatOrderReference(order.reference)} PDF`}>Download PDF</a>}{invoice.receiptUrl&&<a className="text-brand hover:underline" href={invoice.receiptUrl} target="_blank" rel="noreferrer">Receipt</a>}</span>)}</div></td></tr>;
    })}</tbody>
   </table>
   </div>
  </section>
  }
  {(licences.length>0||subscriptions.length>0)&&<section aria-label="Services and access" className="overflow-hidden rounded-md border border-line bg-white"><header className="border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">Services &amp; access</h2><p className="mt-1 text-xs text-muted">Your Google Reviews and Multi-Link access are separate from stand orders.</p></header><div className="tr-client-table-wrap overflow-x-auto"><table className="tr-client-table w-full min-w-[620px] text-left text-sm"><thead className="border-b border-line bg-soft text-xs text-muted"><tr>{['Service','Access','Status','Billing','Actions'].map(label=><th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-line">{licences.map(licence=><tr key={licence.id} data-dashboard-row onClick={event=>activateListRow(event,()=>setSelected({kind:'licence',value:licence}))}><th scope="row" className="px-4 py-4 font-medium"><span className="flex items-center gap-2"><KeyRound size={16}/>{licence.title}</span></th><td className="px-4 py-4">{licence.locationLimit===undefined?'Unlimited locations':`${licence.locationLimit} location${licence.locationLimit===1?'':'s'}`}</td><td className="px-4 py-4"><Badge status={licence.expiresAt&&Date.parse(licence.expiresAt)<=Date.now()?'expired':licence.status}/></td><td className="px-4 py-4 text-muted">{licence.source==='manual'?'Granted by admin · no charge':'Test access'}</td><td className="px-4 py-4"><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'licence',value:licence})}>View access</button></td></tr>)}{subscriptions.map(subscription=><tr key={subscription.id} data-dashboard-row onClick={event=>activateListRow(event,()=>setSelected({kind:'subscription',value:subscription}))}><th scope="row" className="px-4 py-4 font-medium"><span className="flex items-center gap-2"><KeyRound size={16}/>Multi-Link</span></th><td className="px-4 py-4">1 page</td><td className="px-4 py-4"><Badge status={subscriptionStatus(subscription)}/></td><td className="px-4 py-4 text-muted">{subscription.source==='admin'?'Granted by admin · no charge':subscription.source==='manual'?'Managed by Tap Rater':'Subscription'}</td><td className="px-4 py-4"><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'subscription',value:subscription})}>View access</button></td></tr>)}</tbody></table></div></section>}
  {!orders.length&&!licences.length&&!subscriptions.length&&<p className="rounded-md border border-dashed border-line bg-white p-5 text-sm text-muted">No orders yet. Your services will appear here when active.</p>}
  {!!invoiceIndex.other.length&&<details className="rounded-md border border-line bg-white p-4"><summary className="cursor-pointer text-sm font-medium">Other invoices</summary><div className="mt-3 divide-y divide-line">{invoiceIndex.other.map(invoice=><div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{invoice.invoiceNumber||'Invoice'} · {date(invoice.issuedAt)}</span><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'invoice',value:invoice})}>View invoice</button></div>)}</div></details>}
  {selected&&<BillingDetailsDialog selected={selected} setSelected={setSelected} headingId={headingId} invoices={selected.kind==='order'?invoiceIndex.byOrder.get(selected.value.id)||[]:invoices}/>}
 </>;
}
