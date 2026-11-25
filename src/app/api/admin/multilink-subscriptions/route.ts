import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {changeMultiLinkSubscription} from '@/lib/multilink-subscription-actions';

const headers={'Cache-Control':'private, no-store'};
const schema=z.object({subscriptionId:z.string().regex(/^sub_[A-Za-z0-9]+$/),action:z.enum(['cancel_at_period_end','keep','cancel_now'])});

/** Admin: stop renewal, undo that, or end a Multi-Link subscription today. */
export async function POST(request:Request){
  const denied=await requireAdminApi();if(denied)return denied;
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Choose a subscription and an action.'},{status:400,headers});
  try{
    const rows=await liveDb()`SELECT 1 FROM hosted_subscriptions WHERE stripe_subscription_id=${parsed.data.subscriptionId} LIMIT 1`;
    if(!(rows as unknown[]).length)return NextResponse.json({error:'That Multi-Link subscription was not found.'},{status:404,headers});
  }catch{return NextResponse.json({error:'Could not load the subscription. Try again.'},{status:503,headers});}
  const result=await changeMultiLinkSubscription(parsed.data.subscriptionId,parsed.data.action);
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status,headers});
  return NextResponse.json({ok:true,synced:result.synced},{headers});
}
