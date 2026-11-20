import {buildEmailHtml,getOrderFromEmail,type SendEmailInput,type EmailResult} from './email';
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
