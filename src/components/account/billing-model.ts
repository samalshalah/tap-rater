import type {CustomerPortalOrder,CustomerPortalInvoice,CustomerPortalSubscription,CustomerPortalLicence} from '@/lib/customer-portal';
export type BillingOrder = Omit<CustomerPortalOrder, 'items'> & {items: {id:string;title:string;quantity:number;optionLabel:string;lineSubtotalCents:number;unitAmountCents?:number;details?:string[]}[]};
export type Selection = {kind:'licence';value:CustomerPortalLicence}| {kind:'order'; value:BillingOrder}|{kind:'invoice';value:CustomerPortalInvoice}|{kind:'subscription';value:CustomerPortalSubscription};

/** Preserve input order and duplicate invoices while avoiding a scan per order. */
export function indexBillingInvoices(orders:Pick<BillingOrder,'id'>[],invoices:CustomerPortalInvoice[]){
 const orderIds=new Set<string|undefined>(orders.map(order=>order.id));
 const byOrder=new Map<string|undefined,CustomerPortalInvoice[]>();
 const other:CustomerPortalInvoice[]=[];
 for(const invoice of invoices){const id=invoice.orderId;const group=byOrder.get(id);if(group)group.push(invoice);else byOrder.set(id,[invoice]);if(!orderIds.has(id))other.push(invoice);}
 return {byOrder,other};
}
