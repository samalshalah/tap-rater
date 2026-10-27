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
  <section id="invoices" aria-label="Orders" className="overflow-x-auto rounded-md border border-line bg-white">
   <table className="w-full min-w-[700px] text-left text-sm">
    <thead className="border-b border-line bg-soft text-xs text-muted"><tr>{['Order','Date','Items','Status','Total','Actions'].map(label=><th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
    <tbody className="divide-y divide-line">{orders.map(order=>{
     const documents=invoiceIndex.byOrder.get(order.id)||[];
     return <tr key={order.id} data-dashboard-row onClick={event=>activateListRow(event,()=>setSelected({kind:'order',value:order}))}><th scope="row" className="px-4 py-4 font-medium">{formatOrderReference(order.reference)}{order.paymentStatus==='complimentary'&&<span className="mt-1 flex items-center gap-1 text-xs text-muted"><Gift size={13}/>Granted by admin · One-time</span>}</th><td className="whitespace-nowrap px-4 py-4 text-muted">{date(order.createdAt)||'—'}</td><td className="px-4 py-4">{order.itemCount}</td><td className="px-4 py-4"><Badge status={order.paymentStatus||order.status}/></td><td className="whitespace-nowrap px-4 py-4">{money(order.totalCents,order.currency)}</td><td className="px-4 py-3"><div className="flex flex-wrap items-center gap-x-4 gap-y-2"><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'order',value:order})}>View order</button>{documents.map(invoice=><span key={invoice.id} className="inline-flex flex-wrap items-center gap-x-4 gap-y-2"><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'invoice',value:invoice})}>{documents.length>1?`Invoice ${invoice.invoiceNumber||''}`:'View invoice'}</button>{invoice.invoicePdfUrl&&<a className="text-brand hover:underline" href={invoice.invoicePdfUrl} target="_blank" rel="noreferrer" aria-label={`Download invoice ${invoice.invoiceNumber||formatOrderReference(order.reference)} PDF`}>Download PDF</a>}{invoice.receiptUrl&&<a className="text-brand hover:underline" href={invoice.receiptUrl} target="_blank" rel="noreferrer">Receipt</a>}</span>)}</div></td></tr>;
    })}{licences.map(licence=><tr key={licence.id} data-dashboard-row onClick={event=>activateListRow(event,()=>setSelected({kind:'licence',value:licence}))}><th scope="row" className="px-4 py-4 font-medium"><span className="flex items-center gap-2"><KeyRound size={16}/>{licence.title}</span><span className="mt-1 block text-xs font-normal text-muted">{licence.source==='manual'?'Granted by admin':'Test access'}</span></th><td className="px-4 py-4 text-muted">{date(licence.updatedAt)||'—'}</td><td className="px-4 py-4">{licence.locationLimit===undefined?'Unlimited locations':`${licence.locationLimit} location${licence.locationLimit===1?'':'s'}`}</td><td className="px-4 py-4"><Badge status={licence.expiresAt&&Date.parse(licence.expiresAt)<=Date.now()?'expired':licence.status}/></td><td className="px-4 py-4 text-muted">No charge</td><td className="px-4 py-4"><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'licence',value:licence})}>View licence</button></td></tr>)}{subscriptions.map(subscription=><tr key={subscription.id} data-dashboard-row onClick={event=>activateListRow(event,()=>setSelected({kind:'subscription',value:subscription}))}><th scope="row" className="px-4 py-4 font-medium"><span className="flex items-center gap-2"><KeyRound size={16}/>Multi-Link</span><span className="mt-1 block text-xs font-normal text-muted">{subscription.source==='admin'?'Granted by admin':subscription.permanentCode}</span></th><td className="px-4 py-4 text-muted">{date(subscription.createdAt)||'—'}</td><td className="px-4 py-4">1 licence</td><td className="px-4 py-4"><Badge status={subscriptionStatus(subscription)}/></td><td className="px-4 py-4 text-muted">{subscription.source==='admin'?'No charge':subscription.source==='manual'?'Manual access':'Subscription'}</td><td className="px-4 py-4"><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'subscription',value:subscription})}>View licence</button></td></tr>)}{!orders.length&&!licences.length&&!subscriptions.length&&<tr><td colSpan={6} className="p-5 text-muted">No orders yet.</td></tr>}</tbody>
   </table>
  </section>
  {!!invoiceIndex.other.length&&<details className="rounded-md border border-line bg-white p-4"><summary className="cursor-pointer text-sm font-medium">Other invoices</summary><div className="mt-3 divide-y divide-line">{invoiceIndex.other.map(invoice=><div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{invoice.invoiceNumber||'Invoice'} · {date(invoice.issuedAt)}</span><button className="text-brand hover:underline" onClick={()=>setSelected({kind:'invoice',value:invoice})}>View invoice</button></div>)}</div></details>}
  {selected&&<BillingDetailsDialog selected={selected} setSelected={setSelected} headingId={headingId} invoices={selected.kind==='order'?invoiceIndex.byOrder.get(selected.value.id)||[]:invoices}/>}
 </>;
}
