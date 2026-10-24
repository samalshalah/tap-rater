import {AccountShell} from '@/components/account/account-shell';
import {CustomerOrdersManager} from '@/components/account/customer-orders-manager';
import {requireCustomer} from '@/lib/customer-auth';
import {getOrderLineItemProductionSummary} from '@/lib/orders';
import {getCustomerPortal} from '@/lib/customer-portal';
export default async function AccountOrdersPage({searchParams}:{searchParams?:Promise<{billing_error?:string}>}){
 const session=await requireCustomer();
 const portal=await getCustomerPortal(session.email);
 const params=await searchParams;
 const orders=portal.orders.map(order=>({...order,paymentMethodLabel:order.paymentMethodLabel==='Not recorded yet'?(portal.invoices.find(invoice=>invoice.orderId===order.id)?.paymentMethodLabel||order.paymentMethodLabel):order.paymentMethodLabel,items:order.items.map(({id,title,quantity,optionLabel,lineSubtotalCents,unitAmountCents,lineItem})=>{
  const summary=getOrderLineItemProductionSummary(lineItem);
  return {id,title,quantity,optionLabel,lineSubtotalCents,unitAmountCents,details:[summary.businessName?`Business: ${summary.businessName}`:'',summary.nfcBehavior,summary.printedQrLabel,summary.ctaText?`Printed text: ${summary.ctaText}`:''].filter(Boolean)};
 })}));
 return <AccountShell><div className="grid gap-5"><header className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white p-4"><h1 className="text-xl font-semibold">Orders &amp; Billing</h1>{(portal.orders.some(order=>order.paymentReference)||portal.subscriptions.some(subscription=>subscription.billingProfileAvailable))&&<form action="/api/account/billing-portal" method="post"><button className="tr-button-ghost" type="submit">Manage payment method</button></form>}</header>{params?.billing_error&&<p role="alert" className="rounded-md bg-amber-50 p-3 text-sm">{params.billing_error}</p>}{portal.orders.some(order=>order.paymentStatus==='manual_unpaid')&&<p role="status" className="text-sm text-muted">Some payments are waiting for Tap Rater review.</p>}<CustomerOrdersManager orders={orders} invoices={portal.invoices} subscriptions={portal.subscriptions} licences={portal.licences}/></div></AccountShell>;
}
