import {expect,it} from 'vitest';
import {indexBillingInvoices} from '@/components/account/billing-model';
import type {CustomerPortalInvoice} from '@/lib/customer-portal';
const invoice=(id:string,orderId?:string)=>({id,orderId} as CustomerPortalInvoice);
it('preserves multiple invoice order and duplicate entries without changing records',()=>{
 const first=invoice('first','a'),second=invoice('second','a'),other=invoice('other','b');const invoices=[first,other,second,first];
 const result=indexBillingInvoices([{id:'a'},{id:'b'}],invoices);
 expect(result.byOrder.get('a')).toEqual([first,second,first]);expect(result.byOrder.get('b')).toEqual([other]);expect(result.other).toEqual([]);expect(invoices).toEqual([first,other,second,first]);
});
it('retains unmatched and unassigned invoices in their original order',()=>{
 const invoices=[invoice('unassigned'),invoice('attached','a'),invoice('foreign','b'),invoice('empty','')];
 expect(indexBillingInvoices([{id:'a'}],invoices).other).toEqual([invoices[0],invoices[2],invoices[3]]);
});
it('handles empty data, duplicate order IDs and special keys',()=>{
 expect(indexBillingInvoices([],[]).other).toEqual([]);
 const invoices=[invoice('one','__proto__'),invoice('two','constructor')];
 expect(indexBillingInvoices([{id:'__proto__'},{id:'__proto__'}],invoices).byOrder.get('__proto__')).toEqual([invoices[0]]);
 expect(indexBillingInvoices([],invoices).other).toEqual(invoices);
});
it('matches the old per-order and other-invoice scans',()=>{
 const orders=Array.from({length:75},(_,i)=>({id:String(i)}));
 const invoices=Array.from({length:250},(_,i)=>invoice(String(i),i%9===0?undefined:String(i%100)));
 const result=indexBillingInvoices(orders,invoices);
 for(const order of orders)expect(result.byOrder.get(order.id)||[]).toEqual(invoices.filter(invoice=>invoice.orderId===order.id));
 expect(result.other).toEqual(invoices.filter(invoice=>!orders.some(order=>order.id===invoice.orderId)));
});
it('reads each invoice association once regardless of order count',()=>{
 let reads=0;const invoices=Array.from({length:1000},(_,i)=>({...invoice(String(i)),get orderId(){reads++;return String(i);}}));
 indexBillingInvoices(Array.from({length:1000},(_,i)=>({id:String(i)})),invoices);
 expect(reads).toBe(1000);
});
it('rebuilds associations for replacement data after an update',()=>{
 const old=[invoice('one','a')],next=[invoice('one','b')];
 expect(indexBillingInvoices([{id:'a'}],old).other).toEqual([]);
 expect(indexBillingInvoices([{id:'a'}],next).other).toEqual(next);
});
