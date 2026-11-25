import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '@/lib/customer-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {changeMultiLinkSubscription} from '@/lib/multilink-subscription-actions';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const schema=z.object({code:z.string().regex(/^[A-HJKMNPQRSTVWXYZ2-9]{12}$/),action:z.enum(['cancel','keep'])});

/**
 * Customer: cancel a Multi-Link page's renewal (it stays live until the paid-through date), or undo that.
 * Ending a page early or refunding is done by Tap Rater.
 */
export async function POST(request:Request){
  const auth=await requireCustomerApi();
  if(auth.response)return auth.response;
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request.'},{status:403,headers});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Choose a Multi-Link page.'},{status:400,headers});
  let subscriptionId:string|undefined;
  try{
    const rows=await liveDb()`SELECT s.stripe_subscription_id FROM hosted_subscriptions s JOIN customers c ON c.id=s.customer_id
      WHERE s.permanent_code=${parsed.data.code} AND lower(c.email)=${auth.session.email.trim().toLowerCase()} AND c.account_status='active' LIMIT 1`;
    subscriptionId=(rows as {stripe_subscription_id?:string}[])[0]?.stripe_subscription_id;
  }catch{return NextResponse.json({error:'Could not load your subscription. Try again.'},{status:503,headers});}
  if(!subscriptionId)return NextResponse.json({error:'That Multi-Link page was not found on your account.'},{status:404,headers});
  const result=await changeMultiLinkSubscription(subscriptionId,parsed.data.action==='cancel'?'cancel_at_period_end':'keep');
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status,headers});
  return NextResponse.json({ok:true},{headers});
}
