import {reviewsBuyerProfileSchema} from '@/lib/reviews-buyer-profile';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '@/lib/customer-auth';
import {createMarketingCheckout,marketingCheckoutEnabled,prepareMarketingBuyer} from '@/lib/marketing-subscriptions';
import {checkLoginRateLimit,recordLoginAttempt} from '@/lib/auth-rate-limit';
import {marketingPurchaseSchema} from '@/lib/marketing-plan';
import {getStripeClient,getStripeMode,getCheckoutSiteUrl} from '@/lib/checkout';
import {liveDb} from '@/lib/google-business/live-reviews';
import {getCustomerReviewSubscription} from '@/lib/customer-review-subscription';
import {currentReviewPreview,reserveReviewPreview} from '@/lib/reviews-purchase-preview';
import {hasCustomerMarketingAccess} from '@/lib/customer-marketing-access';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 try{const subscription=await getCustomerReviewSubscription(auth.session.email);
 return NextResponse.json({subscription,available:marketingCheckoutEnabled()},{headers});}catch{return NextResponse.json({error:'Subscription status unavailable.'},{status:503,headers});}
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
  const {attempt,email,previewId,firstName,lastName,phone,...p}=z.object({attempt:z.string().uuid(),previewId:z.string().uuid(),email:z.string().trim().email().max(254).optional(),firstName:z.string().optional(),lastName:z.string().optional(),phone:z.string().optional(),...marketingPurchaseSchema.shape}).strict().parse(data);
  const profile=auth.session?undefined:reviewsBuyerProfileSchema.parse({firstName,lastName,phone});
  const buyerEmail=auth.session?.email||email;if(!buyerEmail)throw Error('Enter your email.');
  if(auth.session&&await hasCustomerMarketingAccess(auth.session.email))throw Error('Your account already has Reviews access. Open Reviews in your account.');
  const preview=await currentReviewPreview();if(!preview?.complete||!preview.verified_name)throw Error('Connect Google and finish your review analysis before checkout.');
  if(preview.id!==previewId)throw Error('Your business preview changed in another tab. Return to review analysis before continuing.');
  const limit=await checkLoginRateLimit({headers:request.headers,identifier:buyerEmail,scope:'customer_recovery'});
  if(!limit.context.configured||limit.limited)return NextResponse.json({error:'Please wait before trying checkout again.'},{status:429,headers});
  await recordLoginAttempt(limit.context,false);
  await prepareMarketingBuyer(buyerEmail,profile?profile.firstName+' '+profile.lastName:String(preview.verified_name).slice(0,150),auth.session?.email,profile);
  const reserved=await reserveReviewPreview(buyerEmail,attempt,getStripeMode());
  const session=await createMarketingCheckout(buyerEmail,p,attempt,{mode:'payment',ui_mode:'hosted_page',integration_identifier:'taprater_growth_hjksapqw',success_url:`${site}/google-reviews/thank-you`,cancel_url:`${site}/google-reviews?checkout=cancelled#plan`,metadata:{marketing_only:'true',reviews_preview_id:String(reserved.id)},billing_address_collection:'required'});
  return NextResponse.json({url:session.url},{headers});
 }catch(e){return NextResponse.json({error:e instanceof z.ZodError?'Enter your first name, last name, a valid email, and a valid phone number if provided.':e instanceof Error?e.message:'Checkout is unavailable.'},{status:400,headers});}
}
