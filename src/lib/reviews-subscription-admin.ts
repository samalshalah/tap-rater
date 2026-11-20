import {buildEmailHtml,getDefaultFromEmail,getOrderFromEmail,getOrderReplyToEmail,type SendEmailInput,type EmailResult} from './email';
import {sendCommerceEmail} from './commerce-email-outbox';
import {liveDb} from './google-business/live-reviews';
import {marketingPlan} from './marketing-plan';

type Sql=ReturnType<typeof liveDb>;
type SendFn=(input:SendEmailInput)=>Promise<EmailResult>;

/** Google Reviews subscriptions are not stand orders, so they never create an `orders` row. This lists them for admin. */
export type ReviewsSubscriptionRow={stripe_subscription_id:string;stripe_mode:string;status:string;locations:number;current_period_end:string|null;cancel_at_period_end:boolean;updated_at:string;email:string;name:string|null;businesses:string|null};
export async function listReviewsSubscriptions(sql:Sql=liveDb()):Promise<ReviewsSubscriptionRow[]>{
 const rows=await sql`SELECT m.stripe_subscription_id,m.stripe_mode,m.status,m.locations,m.current_period_end,m.cancel_at_period_end,m.updated_at,
  c.email,c.name,
  (SELECT string_agg(b.business_name,', ' ORDER BY b.business_name) FROM businesses b WHERE b.customer_id=c.id AND b.status IS DISTINCT FROM 'marketing_removed') AS businesses
 FROM marketing_subscriptions m JOIN customers c ON c.id=m.customer_id
 WHERE m.stripe_subscription_id IS NOT NULL
 ORDER BY m.updated_at DESC LIMIT 200`;
 return rows as ReviewsSubscriptionRow[];
}

/**
 * Emails ORDER_NOTIFICATION_EMAIL (order@taprater.com) once per paid Google Reviews subscription.
 * The outbox idempotency key keeps webhook retries and renewals from sending it again.
 */
export async function notifyNewReviewsSubscription({subscriptionId,account,locations,mode,sql=liveDb(),send=sendCommerceEmail,env=process.env}:{subscriptionId:string;account:string;locations:number;mode:string;sql?:Sql;send?:SendFn;env?:Record<string,string|undefined>}){
 const to=env.ORDER_NOTIFICATION_EMAIL?.trim();
 if(!to)return {sent:false as const,reason:'missing_notification_email'};
 const [customer]=await sql`SELECT c.email,c.name,
  (SELECT p.verified_name FROM reviews_purchase_previews p WHERE p.customer_id=c.id AND p.paid_at IS NOT NULL ORDER BY p.paid_at DESC LIMIT 1) AS business
  FROM customers c WHERE c.id=${account}::uuid`;
 const name=String(customer?.name||customer?.email||'New customer');
 const site=(env.NEXT_PUBLIC_SITE_URL||'https://taprater.com').replace(/\/$/,'');
 const total=(marketingPlan.monthlyCents*locations/100).toFixed(2);
 const html=buildEmailHtml({eyebrow:'New subscription',title:'New Google Reviews subscription',
  intro:`${name} subscribed to Google Reviews.`,
  rows:{Customer:name,Email:customer?.email?String(customer.email):'—',Business:customer?.business?String(customer.business):'Chosen during setup',Locations:locations,'Monthly total':`$${total}`,Mode:mode==='live'?'Live':'Test','Stripe subscription':subscriptionId},
  cta:{label:'View subscriptions',url:`${site}/admin/subscriptions`}});
 return send({to,from:getOrderFromEmail(env),...(customer?.email?{replyTo:String(customer.email)}:{}),subject:`New Google Reviews subscription · ${name}`,html,
  delivery:{messageType:'reviews_subscription_admin',audience:'admin',entityType:'marketing_subscription',entityId:subscriptionId,retryable:true,idempotencyKey:`reviews_subscription_admin:${subscriptionId}`}});
}

export type MultiLinkSubscriptionRow={stripe_subscription_id:string;id:string;permanent_code:string;hosted_page_url:string;status:string;lifecycle_status:string;current_period_end:string|null;cancel_at_period_end:boolean;created_at:string;email:string|null;name:string|null;business_name:string|null};
/** How a Multi-Link page is paid for. Manual and admin orders have no Stripe subscription, so Stripe never sends them a status. */
export function multiLinkBilling(stripeSubscriptionId:string):'stripe'|'manual'|'complimentary'{
 return /^(admin:|manual:comp_)/.test(stripeSubscriptionId)?'complimentary':stripeSubscriptionId.startsWith('manual:')?'manual':'stripe';
}
/** Hosted Multi-Link page subscriptions ($9.99/month each), newest first. */
export async function listMultiLinkSubscriptions(sql:Sql=liveDb()):Promise<MultiLinkSubscriptionRow[]>{
 const rows=await sql`SELECT h.id,h.stripe_subscription_id,h.permanent_code,h.hosted_page_url,h.status,h.lifecycle_status,h.current_period_end,h.cancel_at_period_end,h.created_at,
  c.email,c.name,b.business_name
 FROM hosted_subscriptions h LEFT JOIN customers c ON c.id=h.customer_id LEFT JOIN businesses b ON b.id=h.business_id
 ORDER BY h.created_at DESC LIMIT 200`;
 return rows as MultiLinkSubscriptionRow[];
}

export type CancellationChange='canceled'|'resumed';
/**
 * Emails the client and ORDER_NOTIFICATION_EMAIL when a Google Reviews subscription is set to cancel at the end of its
 * paid period, or when that cancellation is undone. Keyed by the Stripe event, so webhook retries send nothing twice.
 */
export async function notifyReviewsCancellationChange({change,subscriptionId,account,end,eventId,mode,sql=liveDb(),send=sendCommerceEmail,env=process.env}:{change:CancellationChange;subscriptionId:string;account:string;end:string;eventId:string;mode:string;sql?:Sql;send?:SendFn;env?:Record<string,string|undefined>}){
 const [customer]=await sql`SELECT c.email,c.name,c.first_name FROM customers c WHERE c.id=${account}::uuid`;
 if(!customer?.email)return [];
 const email=String(customer.email),name=String(customer.name||email);
 const firstName=String(customer.first_name||'').trim();
 const site=(env.NEXT_PUBLIC_SITE_URL||'https://taprater.com').replace(/\/$/,'');
 const endDate=new Date(end).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 const canceled=change==='canceled';
 const client=buildEmailHtml({eyebrow:'Google Reviews',title:canceled?'Your subscription is canceled':'Your subscription will renew',
  intro:`${firstName?`Hi ${firstName}, `:''}${canceled?`your Google Reviews subscription will end on ${endDate}. It will not renew and you will not be charged again.`:`your Google Reviews subscription will keep renewing as usual.`}`,
  body:canceled?[`Everything keeps working until ${endDate}: review imports, AI replies and alerts.`,'After that, your reviews and drafts stay available for 30 days.','Changed your mind? Choose "Keep your subscription" on your Subscription page before that date.']:[`Your next renewal is on ${endDate}.`],
  cta:{label:'Open Subscription',url:`${site}/account/packages`}});
 const results:EmailResult[]=[];
 results.push(await send({to:email,from:getDefaultFromEmail(env),replyTo:getOrderReplyToEmail(env),subject:canceled?'Your Google Reviews subscription is canceled':'Your Google Reviews subscription will renew',html:client,
  delivery:{messageType:`reviews_${change}_customer`,audience:'customer',entityType:'marketing_subscription',entityId:subscriptionId,retryable:true,idempotencyKey:`reviews_${change}_customer:${eventId}`}}));
 const to=env.ORDER_NOTIFICATION_EMAIL?.trim();
 if(to){
  const admin=buildEmailHtml({eyebrow:'Subscription change',title:canceled?'Google Reviews subscription canceled':'Google Reviews cancellation undone',
   intro:canceled?`${name} canceled Google Reviews. Service ends on ${endDate}.`:`${name} chose to keep Google Reviews. It renews on ${endDate}.`,
   rows:{Customer:name,Email:email,'Ends / renews':endDate,Mode:mode==='live'?'Live':'Test','Stripe subscription':subscriptionId},
   cta:{label:'View subscriptions',url:`${site}/admin/subscriptions`}});
  results.push(await send({to,from:getOrderFromEmail(env),replyTo:email,subject:`${canceled?'Canceled':'Kept'}: Google Reviews · ${name}`,html:admin,
   delivery:{messageType:`reviews_${change}_admin`,audience:'admin',entityType:'marketing_subscription',entityId:subscriptionId,retryable:true,idempotencyKey:`reviews_${change}_admin:${eventId}`}}));
 }
 return results;
}
