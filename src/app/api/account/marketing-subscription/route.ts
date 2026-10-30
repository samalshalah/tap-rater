import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '@/lib/customer-auth';
import {createMarketingCheckout,marketingCheckoutEnabled,prepareMarketingBuyer} from '@/lib/marketing-subscriptions';
import {checkLoginRateLimit,recordLoginAttempt} from '@/lib/auth-rate-limit';
import {marketingPurchaseSchema} from '@/lib/marketing-plan';
import {getStripeClient,getStripeMode,getCheckoutSiteUrl} from '@/lib/checkout';
import {liveDb} from '@/lib/google-business/live-reviews';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 try{const [s]=await liveDb()`SELECT m.status,m.cadence,m.locations,m.current_period_end,m.cancel_at_period_end FROM marketing_subscriptions m JOIN customers c ON c.id=m.customer_id WHERE lower(c.email)=${auth.session.email.toLowerCase()} AND m.stripe_mode=${getStripeMode()}`;
 return NextResponse.json({subscription:s??null,available:marketingCheckoutEnabled()},{headers});}catch{return NextResponse.json({error:'Subscription status unavailable.'},{status:503,headers});}
}
export async function POST(request:Request){
 const auth=await requireCustomerApi();
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try{
  const raw=await request.text();if(raw.length>4000)throw Error('Invalid request.');const data=JSON.parse(raw);
  const site=getCheckoutSiteUrl(new URL(request.url).origin);
  if(data.action==='portal'){
   if(auth.response)return auth.response;
   const [s]=await liveDb()`SELECT m.stripe_customer_id FROM marketing_subscriptions m JOIN customers c ON c.id=m.customer_id WHERE lower(c.email)=${auth.session.email.toLowerCase()} AND c.account_status='active' AND m.stripe_mode=${getStripeMode()}`;
   if(!s?.stripe_customer_id)throw Error('No subscription is available to manage.');
   if(!process.env.MARKETING_PORTAL_CONFIGURATION_ID)throw Error('Billing management is temporarily unavailable. Contact support.');
   const configuration=process.env.MARKETING_PORTAL_CONFIGURATION_ID;
   const portal=await getStripeClient().billingPortal.sessions.create({...(configuration==='default'?{}:{configuration}),customer:s.stripe_customer_id,return_url:`${site}/account/packages`});
   return NextResponse.json({url:portal.url},{headers});
  }
  if(!marketingCheckoutEnabled())return NextResponse.json({error:'New package subscriptions are currently unavailable.'},{status:503,headers});
  const {attempt,email,name,...p}=z.object({attempt:z.string().uuid(),email:z.string().email().max(254).optional(),name:z.string().trim().min(1).max(150).optional(),...marketingPurchaseSchema.shape}).strict().parse(data);
  const buyerEmail=auth.session?.email||email;if(!buyerEmail||(!auth.session&&!name))throw Error('Enter your name and email.');
  const limit=await checkLoginRateLimit({headers:request.headers,identifier:buyerEmail,scope:'customer_recovery'});
  if(!limit.context.configured||limit.limited)return NextResponse.json({error:'Please wait before trying checkout again.'},{status:429,headers});
  await recordLoginAttempt(limit.context,false);
  await prepareMarketingBuyer(buyerEmail,name||'',auth.session?.email);
  const session=await createMarketingCheckout(buyerEmail,p,attempt,{mode:'payment',ui_mode:'hosted_page',integration_identifier:'taprater_growth_hjksapqw',success_url:`${site}/growth/thank-you`,cancel_url:`${site}/growth`,metadata:{marketing_only:'true'},billing_address_collection:'required'});
  return NextResponse.json({url:session.url},{headers});
 }catch(e){return NextResponse.json({error:e instanceof z.ZodError?'Check your plan selection.':e instanceof Error?e.message:'Checkout is unavailable.'},{status:400,headers});}
}
