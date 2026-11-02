import {z} from 'zod';
import {googleAdminIdentity} from '@/lib/google-business/http';
import {liveDb} from '@/lib/google-business/live-review-core';
import {runLiveReviews} from '@/lib/google-business/live-http';
import {reviewEmailSettings,saveEmailPrefs} from '@/lib/review-email-preferences';

type Context={params:Promise<{id:string;locationId:string}>};
async function handle(request:Request,context:Context){
  const identity=await googleAdminIdentity();
  if(!identity)return Response.json({error:'Admin sign-in required.'},{status:401});
  const {id:accountId,locationId}=await context.params;
  const missing=()=>Response.json({error:'Review workspace unavailable.'},{status:404});
  if(!z.string().uuid().safeParse(accountId).success||!z.string().uuid().safeParse(locationId).success)return missing();
  if(request.method!=='GET'&&request.headers.get('origin')!==new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://taprater.com').origin)
    return Response.json({error:'Invalid request origin.'},{status:403});
  const [account]=await liveDb()`SELECT c.email FROM customers c JOIN businesses b ON b.customer_id=c.id
    WHERE c.id=${accountId} AND b.id=${locationId} AND c.account_status='active'
    AND b.status IS DISTINCT FROM 'marketing_removed' AND marketing_location_allowed(b.id)`;
  if(!account)return missing();
  if(new URL(request.url).searchParams.get('view')==='notifications'){
    if(request.method!=='POST')return new Response(null,{status:405});
    const input=reviewEmailSettings.safeParse(await request.json().catch(()=>null));
    if(!input.success||input.data.businessId!==locationId)return missing();
    const version=await saveEmailPrefs(account.email,input.data);
    if(!version)return Response.json({error:'Settings changed. Reload and try again.'},{status:409});
    console.info('Admin review operation',{owner:identity.owner,location:locationId,action:'notificationSettings'});
    return Response.json({version});
  }
  return runLiveReviews(request,{kind:'customer',email:account.email},identity.owner,locationId);
}
export const dynamic='force-dynamic';
export const GET=handle;
export const POST=handle;
