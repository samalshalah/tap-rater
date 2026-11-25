import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {changeMultiLinkSubscription,changeReviewsSubscription} from '@/lib/multilink-subscription-actions';
import {readHostedRowLine} from '@/lib/hosted-subscription-lifecycle';

const headers={'Cache-Control':'private, no-store'};
const schema=z.object({subscriptionId:z.string().regex(/^sub_[A-Za-z0-9]+$/),action:z.enum(['cancel_at_period_end','keep','cancel_now']),product:z.enum(['multilink','reviews']).default('multilink'),code:z.string().regex(/^[A-HJKMNPQRSTVWXYZ2-9]{12}$/).optional()});

/** Admin: stop renewal, undo that, or end a Multi-Link or Google Reviews subscription today. */
export async function POST(request:Request){
  const denied=await requireAdminApi();if(denied)return denied;
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Choose a subscription and an action.'},{status:400,headers});
  let line:string|undefined;
  try{
    const id=parsed.data.subscriptionId,code=parsed.data.code??null;
    const rows=parsed.data.product==='reviews'
      ?await liveDb()`SELECT NULL AS stripe_checkout_session_id FROM marketing_subscriptions WHERE stripe_subscription_id=${id} LIMIT 1`
      :await liveDb()`SELECT stripe_checkout_session_id FROM hosted_subscriptions WHERE stripe_subscription_id=${id} AND (${code}::text IS NULL OR permanent_code=${code}) LIMIT 1`;
    // With a page code, only that page changes (one checkout can pay for several pages).
    if(code)line=readHostedRowLine((rows as {stripe_checkout_session_id?:string}[])[0]?.stripe_checkout_session_id);
    if(!(rows as unknown[]).length)return NextResponse.json({error:'That subscription was not found.'},{status:404,headers});
  }catch{return NextResponse.json({error:'Could not load the subscription. Try again.'},{status:503,headers});}
  const result=parsed.data.product==='reviews'
    ?await changeReviewsSubscription(parsed.data.subscriptionId,parsed.data.action)
    :await changeMultiLinkSubscription(parsed.data.subscriptionId,parsed.data.action,undefined,line);
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status,headers});
  return NextResponse.json({ok:true,synced:result.synced},{headers});
}
