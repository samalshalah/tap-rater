import {createHash} from 'node:crypto';
import {z} from 'zod';
import type Stripe from 'stripe';
import {getStripeClient,getStripeMode} from './checkout';
import {liveDb} from './google-business/live-review-core';
import {getSupabaseAdmin} from './db';
import {withStripeResourceLock} from './stripe-processing';

export const planChoiceSchema=z.object({kind:z.enum(['locations','cancel','keep']),removedIds:z.array(z.string().uuid()).max(10).default([]),unusedToRemove:z.number().int().min(0).max(10).default(0)}).strict();
export type PlanChoice=z.infer<typeof planChoiceSchema>;
const idOf=(value:any):string=>typeof value==='string'?value:value?.id||'';
const iso=(seconds:number)=>new Date(seconds*1000).toISOString();
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const OWNER='reviews_plan_v1';

export function supportedReviewPlan(sub:Stripe.Subscription,account:string){
 const item=sub.items.data[0],price=item?.price;
 if(sub.metadata.tap_rater!=='marketing_growth_v1'||sub.metadata.account_id!==account||sub.items.data.length!==1||price?.currency!=='usd'||price.unit_amount!==2900||price.recurring?.interval!=='month'||price.recurring.interval_count!==1||!item.quantity||item.quantity>10)throw Error('This plan needs support to make billing changes.');
 if(sub.status!=='active'||sub.pause_collection||sub.pending_update||sub.collection_method!=='charge_automatically'||sub.discounts?.length||item.discounts?.length||sub.trial_end)throw Error('Resolve any payment issue or contact support before changing this plan.');
 return item;
}

export function planProposal(sub:Stripe.Subscription,choice:PlanChoice,locations:{id:string}[],pending:string[],now=Date.now(),pendingUnused=0){
 const item=sub.items.data[0],quantity=item.quantity!;
 if(item.current_period_end*1000-now<300000)throw Error('Renewal is being processed. Please try again after renewal.');
 const ids=[...new Set(choice.removedIds)].sort();
 if(ids.length!==choice.removedIds.length||ids.some(id=>!locations.some(l=>l.id===id)))throw Error('Choose only paid locations belonging to this subscription.');
 if(choice.kind!=='locations'&&(ids.length||choice.unusedToRemove))throw Error('Invalid subscription action.');
 if(choice.unusedToRemove>Math.max(0,quantity-locations.length))throw Error('Unused licence count changed. Refresh your plan.');
 const nextQuantity=choice.kind==='cancel'?0:choice.kind==='keep'?quantity:quantity-ids.length-choice.unusedToRemove;
 if(choice.kind==='locations'&&nextQuantity<1)throw Error('To remove the last paid location, choose Cancel entire subscription.');
 if(choice.kind==='locations'&&(sub.cancel_at_period_end||sub.cancel_at))throw Error('Keep your subscription first before changing its locations.');
 const result={kind:choice.kind,removedIds:ids,unusedToRemove:choice.unusedToRemove,currentQuantity:quantity,nextQuantity,currentSubtotal:quantity*priceAmount(item),nextSubtotal:nextQuantity*priceAmount(item),currency:item.price.currency,effectiveAt:iso(item.current_period_end)};
 return {...result,token:hash({id:sub.id,start:item.current_period_start,end:item.current_period_end,quantity,cancel:sub.cancel_at_period_end||sub.cancel_at||false,pending:[...pending].sort(),pendingUnused,result})};
}
const priceAmount=(item:Stripe.SubscriptionItem)=>item.price.unit_amount!;

async function context(email:string){
 const sql=liveDb(),mode=getStripeMode();
 const [row]=await sql`SELECT c.id,m.stripe_subscription_id,m.stripe_customer_id,p.customer_id AS period_policy FROM customers c
 LEFT JOIN marketing_subscriptions m ON m.customer_id=c.id AND m.stripe_mode=${mode}
 LEFT JOIN reviews_period_licences p ON p.customer_id=c.id
 WHERE lower(c.email)=${email.toLowerCase()} AND c.account_status='active'`;
 if(!row?.stripe_subscription_id||!row.period_policy)return {sql,mode,row,supported:false as const};
 const stripe=getStripeClient(),sub=await stripe.subscriptions.retrieve(String(row.stripe_subscription_id));
 if(sub.livemode!==(mode==='live')||idOf(sub.customer)!==row.stripe_customer_id)throw Error('Subscription ownership could not be verified.');
 const [request]=await sql`SELECT * FROM reviews_billing_requests WHERE customer_id=${row.id} AND stripe_mode=${mode} AND subscription_id=${sub.id}`;
 const schedule=sub.schedule?await stripe.subscriptionSchedules.retrieve(idOf(sub.schedule)):null;
 const owned=!schedule||schedule.metadata?.[OWNER]===row.id||request?.schedule_id===schedule.id;
 const phase=schedule?.phases.find(p=>p.start_date>=sub.items.data[0].current_period_end);
 let pending:string[]=[];
 if(owned&&phase?.metadata?.reviews_remove_ids)pending=z.array(z.string().uuid()).max(10).parse(JSON.parse(phase.metadata.reviews_remove_ids));
 const locations=await sql`SELECT b.id,b.business_name AS name,b.address FROM marketing_location_access m JOIN businesses b ON b.id=m.business_id
 WHERE m.customer_id=${row.id} AND b.customer_id=${row.id} AND m.enabled ORDER BY b.business_name,b.id`;
 const pendingUnused=owned?Number(phase?.metadata?.reviews_remove_unused||0):0;
 return {sql,mode,row,stripe,sub,schedule,owned,pending,pendingUnused,locations,request,supported:true as const};
}

export async function reviewsBillingSnapshot(email:string){
 const c=await context(email);
 if(!c.supported)return {selfServe:false,reason:'Your service is managed by Tap Rater. Contact support to change or cancel it.'};
 let reason='';try{supportedReviewPlan(c.sub,String(c.row.id));if(!c.owned)throw Error('A custom billing schedule is in place. Contact support to change it.');}catch(e){reason=(e as Error).message;}
 const item=c.sub.items.data[0];
 const cancelling=Boolean(c.sub.cancel_at_period_end||c.sub.cancel_at||(c.owned&&c.schedule?.end_behavior==='cancel'));
 const nextQuantity=cancelling?0:item.quantity!-c.pending.length-c.pendingUnused;
 return {selfServe:!reason,reason,quantity:item.quantity,currency:item.price.currency,subtotal:item.quantity!*priceAmount(item),nextQuantity,nextSubtotal:nextQuantity*priceAmount(item),periodEnd:iso(item.current_period_end),cancelling,
  locations:c.locations.map(l=>({...l,removing:c.pending.includes(String(l.id))})),pendingIds:c.pending,pendingUnused:c.pendingUnused,unused:Math.max(0,item.quantity!-c.locations.length),
  retry:c.request&&!c.request.completed?{operationId:c.request.operation_id,choice:c.request.request.choice,token:c.request.request.token}:null};
}

// Preserve the current billing/tax settings when converting a subscription to phases.
export function phaseParams(phase:Stripe.SubscriptionSchedule.Phase):Stripe.SubscriptionScheduleUpdateParams.Phase{
 if(phase.discounts?.length||phase.add_invoice_items?.length||phase.items.some(i=>i.discounts?.length))throw Error('Custom discounts or invoice items require support.');
 return {start_date:phase.start_date,end_date:phase.end_date,items:phase.items.map(i=>({price:idOf(i.price),quantity:i.quantity,tax_rates:i.tax_rates?.map(idOf),metadata:i.metadata||{}})),
  metadata:phase.metadata||{},proration_behavior:'none',
  ...(phase.default_tax_rates?.length?{default_tax_rates:phase.default_tax_rates.map(idOf)}:{}),
  ...(phase.default_payment_method?{default_payment_method:idOf(phase.default_payment_method)}:{}),
  ...(phase.collection_method?{collection_method:phase.collection_method}:{}),
  ...(phase.automatic_tax?{automatic_tax:{enabled:phase.automatic_tax.enabled}}:{})};
}

export async function previewReviewsPlan(email:string,input:unknown){
 const choice=planChoiceSchema.parse(input),c=await context(email);
 if(!c.supported)throw Error('This service is managed by Tap Rater. Contact support to change it.');
 supportedReviewPlan(c.sub,String(c.row.id));
 if(!c.owned)throw Error('A custom billing schedule is in place. Contact support.');
 if(c.request&&!c.request.completed)throw Error('Finish retrying your previous billing change first.');
 return planProposal(c.sub,choice,c.locations as {id:string}[],c.pending,Date.now(),c.pendingUnused);
}

export async function confirmReviewsPlan(email:string,input:unknown){
 const data=z.object({choice:planChoiceSchema,token:z.string().length(64),operationId:z.string().uuid()}).strict().parse(input);
 const initial=await context(email);if(!initial.supported)throw Error('This service is managed by Tap Rater.');
 const result=await withStripeResourceLock(getSupabaseAdmin(),`marketing:${initial.mode}:${initial.row.id}`,async assertActive=>{
  const c=await context(email);if(!c.supported)throw Error('Subscription unavailable.');
  const account=String(c.row.id),item=supportedReviewPlan(c.sub,account);
  const requestHash=hash({kind:data.choice.kind,ids:[...data.choice.removedIds].sort(),unused:data.choice.unusedToRemove,token:data.token});
  const [completed]=await c.sql`SELECT customer_id,request_hash FROM reviews_billing_completed WHERE operation_id=${data.operationId}::uuid`;
  if(completed){if(completed.customer_id!==account||completed.request_hash!==requestHash)throw Error('This request was already used for another change.');return {ok:true as const};}
  const replay=c.request?.operation_id===data.operationId;
  if(replay&&c.request.completed)return {ok:true as const};
  if(c.request&&!c.request.completed&&!replay)throw Error('Retry your previous billing change first.');
  if(replay&&JSON.stringify(c.request.request)!==JSON.stringify({choice:data.choice,token:data.token})){
   // jsonb key order is not stable; compare canonical content instead.
   if(c.request.request.choice.kind!==data.choice.kind||JSON.stringify([...c.request.request.choice.removedIds].sort())!==JSON.stringify([...data.choice.removedIds].sort())||c.request.request.token!==data.token||c.request.request.choice.unusedToRemove!==data.choice.unusedToRemove)throw Error('This billing request has changed.');
  }
  if(replay&&c.request.request.periodEnd!==item.current_period_end)throw Error('Renewal has occurred. Contact support to reconcile the saved change before making another.');
  if(!replay){
   if(!c.owned)throw Error('A custom billing schedule is in place. Contact support.');
   const preview=planProposal(c.sub,data.choice,c.locations as {id:string}[],c.pending,Date.now(),c.pendingUnused);
   if(preview.token!==data.token)throw Error('Your plan changed. Review the updated amount before confirming.');
   const [queued]=await c.sql`SELECT queue_reviews_billing_request(${account}::uuid,${c.mode},${c.sub.id},${data.operationId}::uuid,${JSON.stringify({choice:data.choice,token:data.token,periodEnd:item.current_period_end})}::jsonb,${item.quantity!}) AS queued`;
   if(!queued?.queued)throw Error('Your locations changed. Refresh your plan before confirming.');
  }
  // Retry after a partial provider/database failure uses the same Stripe idempotency keys.
  let schedule=c.schedule;
  const needsSchedule=data.choice.kind==='locations'&&(data.choice.removedIds.length>0||data.choice.unusedToRemove>0);
  if(!schedule&&needsSchedule){
   schedule=await c.stripe.subscriptionSchedules.create({from_subscription:c.sub.id},{idempotencyKey:`reviews-plan-create:${data.operationId}`});
   await assertActive();
   await c.sql`UPDATE reviews_billing_requests SET schedule_id=${schedule.id} WHERE customer_id=${account}::uuid AND operation_id=${data.operationId}::uuid`;
  }else if(schedule&&!c.owned){
   if(!replay)throw Error('Custom billing schedule requires support.');
   const recovered=await c.stripe.subscriptionSchedules.create({from_subscription:c.sub.id},{idempotencyKey:`reviews-plan-create:${data.operationId}`});
   if(recovered.id!==schedule.id)throw Error('Billing schedule ownership could not be verified.');
  }
  await assertActive();
  if(schedule){
   const current=schedule.phases.find(p=>p.start_date<=item.current_period_start&&p.end_date>item.current_period_start);
   if(!current)throw Error('Renewal is processing. Contact support to finish this change.');
   const base=phaseParams(current);
   const phases:Stripe.SubscriptionScheduleUpdateParams.Phase[]=[{...base,end_date:item.current_period_end}];
   if(needsSchedule){
    const {end_date:unused,...next}=base;
    phases.push({...next,start_date:item.current_period_end,duration:{interval:'month',interval_count:1},items:[{...base.items[0],quantity:item.quantity!-data.choice.removedIds.length-data.choice.unusedToRemove}],
     metadata:{...base.metadata,reviews_remove_ids:JSON.stringify([...data.choice.removedIds].sort()),reviews_remove_unused:String(data.choice.unusedToRemove),reviews_remove_at:String(item.current_period_end),reviews_plan_owner:account}});
   }
   await c.stripe.subscriptionSchedules.update(schedule.id,{phases,proration_behavior:'none',end_behavior:data.choice.kind==='cancel'?'cancel':'release',metadata:{[OWNER]:account}},
    {idempotencyKey:`reviews-plan-update:${data.operationId}`});
  }else if(data.choice.kind==='cancel'||data.choice.kind==='keep'){
   await c.stripe.subscriptions.update(c.sub.id,{cancel_at_period_end:data.choice.kind==='cancel',proration_behavior:'none'},
    {idempotencyKey:`reviews-plan-sub:${data.operationId}`});
  }
  await assertActive();
  await c.sql`INSERT INTO reviews_billing_completed(operation_id,customer_id,request_hash) VALUES(${data.operationId}::uuid,${account}::uuid,${requestHash}) ON CONFLICT DO NOTHING`;
  await c.sql`UPDATE reviews_billing_requests SET completed=true WHERE customer_id=${account}::uuid AND operation_id=${data.operationId}::uuid`;
  return {ok:true as const};
 });
 if(!result.ok)throw Error(result.error);return result;
}
