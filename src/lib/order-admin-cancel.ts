// Which orders an admin may cancel without touching money: no live card charge, nothing shipped.
export type CancellableOrder={status:string;payment_status?:string|null;shipping_status?:string|null;stripe_checkout_session_id?:string|null};

const noChargePayments=new Set(['manual_unpaid','complimentary','unpaid']);

export function orderCancelBlock(order:CancellableOrder):string|undefined{
  if(order.status==='canceled')return 'Order is already cancelled.';
  if(['shipped','delivered'].includes(order.shipping_status??''))return 'Order has shipped.';
  const testMode=(order.stripe_checkout_session_id??'').startsWith('cs_test_');
  if(!testMode&&!noChargePayments.has(order.payment_status??''))return 'Customer was charged. Refund it instead.';
  return undefined;
}
