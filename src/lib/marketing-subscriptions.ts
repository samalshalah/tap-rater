import {marketingSalesEnabled} from './marketing-sales';
import type Stripe from 'stripe';
import {createHash} from 'node:crypto';
import {getStripeClient,getStripeMode} from './checkout';
import {liveDb} from './google-business/live-reviews';
import {getSupabaseAdmin} from './db';
import {withStripeResourceLock} from './stripe-processing';
import {addMarketingToCheckout,marketingPurchaseSchema,type MarketingPurchase} from './marketing-plan';
import {createCustomerActivationToken} from './customer-account';
import {sendCustomerActivationEmail} from './hosted-setup-email';

/** A guest reservation never grants access or sends an activation email. */
export async function prepareMarketingBuyer(email:string,name:string,authenticatedEmail?:string){
 const normalized=email.trim().toLowerCase(),sql=liveDb();
 const [existing]=await sql`SELECT id,account_status FROM customers WHERE lower(email)=${normalized}`;
 if(existing?.account_status==='disabled')throw Error('Contact support about this account.');
 if(existing?.account_status==='active'&&authenticatedEmail?.toLowerCase()!==normalized)throw Error('This email already has an account. Sign in to continue.');
 if(!existing)await sql`INSERT INTO customers(email,name,account_status,sessions_invalid_before) VALUES(${normalized},${name},'pending_activation',now()) ON CONFLICT(email) DO NOTHING`;
 // Recheck races with signup/activation; never treat an active account as a guest.
 const [buyer]=await sql`SELECT account_status FROM customers WHERE lower(email)=${normalized}`;
 if(buyer?.account_status!=='pending_activation'&&!(buyer?.account_status==='active'&&authenticatedEmail?.toLowerCase()===normalized))throw Error('Sign in to continue.');
 return normalized;
}

export function marketingCheckoutEnabled(){return marketingSalesEnabled&&process.env.MARKETING_CHECKOUT_ENABLED==='true'&&Boolean(process.env.MARKETING_PORTAL_CONFIGURATION_ID);}
export async function createMarketingCheckout(email:string,purchase:MarketingPurchase,attempt:string,params:Stripe.Checkout.SessionCreateParams){
 if(!marketingCheckoutEnabled())throw Error('Subscriptions are not available yet.');
 const p=marketingPurchaseSchema.parse(purchase),sql=liveDb(),mode=getStripeMode();
 const {integration_identifier:ignored,...stableParams}=params;
 const fingerprint=createHash('sha256').update(JSON.stringify({p,params:stableParams})).digest('hex');
 const [customer]=await sql`SELECT id,email FROM customers WHERE lower(email)=${email.toLowerCase()} AND account_status IN ('active','pending_activation')`;
 if(!customer)throw Error('Sign in to your customer account before subscribing.');
 const result=await withStripeResourceLock(getSupabaseAdmin(),`marketing:${mode}:${customer.id}`,async assertActive=>{
  const [old]=await sql`SELECT * FROM marketing_subscriptions WHERE customer_id=${customer.id} AND stripe_mode=${mode}`;
  if(old?.stripe_subscription_id&&!['canceled','incomplete_expired'].includes(old.status))throw Error('You already have a package. Manage it in your account.');
  if(old?.status==='checkout'&&new Date(old.checkout_expires_at).getTime()>Date.now()&&(old.attempt!==attempt||old.cadence!==p.cadence||old.locations!==p.locations))throw Error('Another checkout is open. Finish it or wait one hour before starting another.');
  if(old?.attempt===attempt&&old.status!=='checkout')throw Error('Start a new purchase attempt.');
  if(old?.attempt===attempt&&old.request_fingerprint!==fingerprint)throw Error('Your checkout selection changed. Start a new purchase attempt.');
  if(old?.attempt===attempt&&old.checkout_session_id){
   const session=await getStripeClient().checkout.sessions.retrieve(old.checkout_session_id);
   if(session.status!=='open')throw Error('This checkout has finished. Refresh your account for its status.');
   return {ok:true as const,session};
  }
  const expires=old?.attempt===attempt?new Date(old.checkout_expires_at):new Date(Date.now()+3600000);
  await sql`INSERT INTO marketing_subscriptions(customer_id,stripe_mode,attempt,request_fingerprint,cadence,locations,checkout_expires_at)
   VALUES(${customer.id},${mode},${attempt},${fingerprint},${p.cadence},${p.locations},${expires.toISOString()}::timestamptz)
   ON CONFLICT(customer_id,stripe_mode) DO UPDATE SET attempt=EXCLUDED.attempt,request_fingerprint=EXCLUDED.request_fingerprint,cadence=EXCLUDED.cadence,locations=EXCLUDED.locations,status='checkout',checkout_expires_at=EXCLUDED.checkout_expires_at,stripe_subscription_id=NULL,checkout_session_id=NULL,updated_at=now()`;
  const stripe=getStripeClient();
  const session=await stripe.checkout.sessions.create(addMarketingToCheckout({...params,integration_identifier:'taprater_growth_hjksapqw',expires_at:Math.floor(expires.getTime()/1000),customer:undefined,customer_email:customer.email},p,String(customer.id),attempt),{idempotencyKey:`marketing:${mode}:${customer.id}:${attempt}`});
  await assertActive();
  await sql`UPDATE marketing_subscriptions SET checkout_session_id=${session.id} WHERE customer_id=${customer.id} AND stripe_mode=${mode} AND attempt=${attempt}`;
  return {ok:true as const,session};
 });
 if(!result.ok)throw Error(result.error);
 return result.session;
}

const stripeId=(v:unknown):string|undefined=>typeof v==='string'?v:v&&typeof v==='object'&&'id' in v?String(v.id):undefined;
export function subscriptionEventId(event:Stripe.Event){
 const obj=event.data.object as unknown as Record<string,any>;
 if(event.type.startsWith('customer.subscription.'))return stripeId(obj);
 if(event.type.startsWith('checkout.session.'))return stripeId(obj.subscription);
 if(event.type.startsWith('invoice.'))return stripeId(obj.parent?.subscription_details?.subscription??obj.subscription);
}
export function marketingSubscriptionState(s:Stripe.Subscription){
 const items=s.items.data;
 if(items.length!==1)throw Error('Unexpected package items.');
 const item=items[0],price=item.price,interval=price.recurring?.interval;
 if(interval!=='month'||price.currency!=='usd'||price.unit_amount!==2900||price.recurring?.interval_count!==1||!item.quantity||item.quantity>10)throw Error('Package price or quantity does not match.');
 const invoice=typeof s.latest_invoice==='object'?s.latest_invoice:null;
 const paid=s.status==='active'&&invoice?.status==='paid'&&!s.pause_collection;
 return {paid,locations:item.quantity,cadence:interval!,end:new Date(item.current_period_end*1000).toISOString()};
}
/** Called only after Stripe signature verification. Retrieve current state under the account lease. */
export async function syncMarketingSubscription(event:Stripe.Event){
 if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)){
  const session=event.data.object as Stripe.Checkout.Session;
  if(!session.metadata?.marketing_account)return {handled:false,standalone:false};
  if(session.livemode!==(getStripeMode()==='live'))throw Error('Payment environment mismatch.');
  await liveDb()`UPDATE marketing_subscriptions SET status='incomplete_expired',updated_at=now() WHERE checkout_session_id=${session.id} AND stripe_mode=${getStripeMode()} AND status='checkout' AND stripe_subscription_id IS NULL`;
  return {handled:true,standalone:session.metadata.marketing_only==='true'};
 }
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','invoice.payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type))return {handled:false,standalone:false};
 const payload=event.data.object as unknown as {metadata?:Record<string,string>;parent?:{subscription_details?:{metadata?:Record<string,string>}};subscription_details?:{metadata?:Record<string,string>}};
 const ours=event.type.startsWith('checkout.')?Boolean(payload.metadata?.marketing_account):event.type.startsWith('invoice.')?(payload.parent?.subscription_details?.metadata??payload.subscription_details?.metadata)?.tap_rater==='marketing_growth_v1':payload.metadata?.tap_rater==='marketing_growth_v1';
 if(!ours)return {handled:false,standalone:false};
 const id=subscriptionEventId(event);if(!id)return {handled:false,standalone:false};
 const stripe=getStripeClient(),initial=await stripe.subscriptions.retrieve(id);
 if(initial.metadata.tap_rater!=='marketing_growth_v1')return {handled:false,standalone:false};
 if(initial.livemode!==(getStripeMode()==='live'))throw Error('Payment environment mismatch.');
 const account=initial.metadata.account_id,attempt=initial.metadata.purchase_attempt,sql=liveDb(),mode=getStripeMode();
 const result=await withStripeResourceLock(getSupabaseAdmin(),`marketing:${mode}:${account}`,async assertActive=>{
  const sub=await stripe.subscriptions.retrieve(id,{expand:['latest_invoice']});
  const state=marketingSubscriptionState(sub);
  const [row]=await sql`SELECT * FROM marketing_subscriptions WHERE customer_id=${account}::uuid AND stripe_mode=${mode} AND attempt=${attempt}`;
  if(!row||row.stripe_subscription_id&&row.stripe_subscription_id!==id)throw Error('Subscription ownership could not be verified.');
  await assertActive();
  if(mode==='test'&&process.env.MARKETING_TEST_ENTITLEMENTS!=='true')throw Error('Test entitlements require an isolated test database.');
  await sql`WITH saved AS (UPDATE marketing_subscriptions SET stripe_subscription_id=${id},stripe_customer_id=${stripeId(sub.customer)},status=${sub.status},cadence=${state.cadence},locations=${state.locations},current_period_end=${state.end}::timestamptz,cancel_at_period_end=${sub.cancel_at_period_end},updated_at=now() WHERE customer_id=${account}::uuid AND stripe_mode=${mode} AND attempt=${attempt} RETURNING customer_id), access AS (
   INSERT INTO customer_marketing_access(customer_id,status,source,expires_at,location_limit,ai_monthly_limit,heatmap_monthly_points)
   SELECT customer_id,${state.paid?'active':'inactive'},'paid',${state.end}::timestamptz,${state.locations},310,588 FROM saved
   ON CONFLICT(customer_id) DO UPDATE SET status=EXCLUDED.status,source='paid',expires_at=EXCLUDED.expires_at,location_limit=EXCLUDED.location_limit,ai_monthly_limit=310,heatmap_monthly_points=588,version=customer_marketing_access.version+1,updated_at=now()
  ) SELECT customer_id FROM saved`;
  // A downgrade never exposes more locations than were paid for. Existing content is preserved.
  await sql`UPDATE marketing_location_access SET enabled=false WHERE business_id IN (SELECT business_id FROM marketing_location_access WHERE customer_id=${account}::uuid AND enabled ORDER BY created_at,business_id OFFSET ${state.locations})`;
  await sql`UPDATE local_heatmap_tracks SET active=false,version=version+1 WHERE customer_id=${account}::uuid AND slot>3 AND active`;
  if(state.paid&&!row.activation_email_sent_at){
   const token=createCustomerActivationToken();
   const [pending]=await sql`UPDATE customers SET activation_token_hash=${token.tokenHash},activation_expires_at=now()+interval '7 days' WHERE id=${account}::uuid AND account_status='pending_activation' RETURNING email`;
   if(pending){
    const delivery=await sendCustomerActivationEmail({to:String(pending.email),activationToken:token.token,customerId:account});
    if(!delivery.sent)throw Error('Paid account activation email could not be sent. Retry webhook delivery.');
    await sql`UPDATE marketing_subscriptions SET activation_email_sent_at=now() WHERE customer_id=${account}::uuid AND stripe_mode=${mode} AND attempt=${attempt}`;
   }
  }
  return {ok:true as const};
 });
 if(!result.ok)throw Error(result.error);
 const obj=event.data.object as unknown as {metadata?:Record<string,string>};
 return {handled:true,standalone:event.type.startsWith('invoice.')||event.type.startsWith('customer.subscription.')||obj.metadata?.marketing_only==='true'};
}
