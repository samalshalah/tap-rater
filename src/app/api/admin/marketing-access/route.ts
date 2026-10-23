import {NextResponse} from 'next/server';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {marketingLimitsInput} from '@/lib/marketing-limits';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const denied=await requireAdminApi();if(denied)return denied;
 try{
  const rows=await liveDb()`SELECT c.id,coalesce(nullif(c.name,''),'Unnamed account') AS name,
   a.status,a.expires_at,coalesce(a.version,0) AS version,coalesce(a.location_limit,1) AS location_limit,
   coalesce(a.ai_monthly_limit,100) AS ai_monthly_limit,coalesce(a.heatmap_monthly_points,300) AS heatmap_monthly_points,
   coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.business_id,'enabled',m.enabled,
    'aiUsed',coalesce((SELECT sum(u.units) FROM marketing_usage_reservations u WHERE u.business_id=m.business_id AND u.service='ai' AND u.month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date),0),
    'pointsUsed',coalesce((SELECT sum(u.units) FROM marketing_usage_reservations u WHERE u.business_id=m.business_id AND u.service='heatmap' AND u.month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date),0)) ORDER BY m.created_at,m.business_id)
    FROM marketing_location_access m WHERE m.customer_id=c.id),'[]'::jsonb) AS locations
   FROM customers c LEFT JOIN customer_marketing_access a ON a.customer_id=c.id WHERE c.account_status='active' ORDER BY name,c.id`;
  return NextResponse.json({accounts:rows,billingActive:false},{headers});
 }catch{return NextResponse.json({error:'Package limits are unavailable. Check the required migration.'},{status:503,headers});}
}
export async function POST(request:Request){
 const denied=await requireAdminApi();if(denied)return denied;
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
 let input;
 try{const raw=await request.text();if(raw.length>60000)throw Error();input=marketingLimitsInput.parse(JSON.parse(raw));if(input.enabledLocations.length>input.locationLimit)throw Error();}
 catch{return NextResponse.json({error:'Check limits, expiry and enabled locations.'},{status:400,headers});}
 try{
  const rows=await liveDb()`WITH saved AS (
   INSERT INTO customer_marketing_access(customer_id,status,source,expires_at,location_limit,ai_monthly_limit,heatmap_monthly_points)
   SELECT c.id,${input.status},'manual',${input.expiresAt}::timestamptz,${input.locationLimit},${input.aiMonthlyLimit},${input.heatmapMonthlyPoints}
   FROM customers c WHERE c.id=${input.customerId} AND c.account_status='active'
   AND NOT EXISTS(SELECT 1 FROM unnest(${input.enabledLocations}::uuid[]) x WHERE NOT EXISTS(SELECT 1 FROM marketing_location_access m WHERE m.business_id=x AND m.customer_id=c.id))
   AND (${input.version}=0 OR EXISTS(SELECT 1 FROM customer_marketing_access a WHERE a.customer_id=c.id))
   ON CONFLICT(customer_id) DO UPDATE SET status=EXCLUDED.status,source='manual',expires_at=EXCLUDED.expires_at,
    location_limit=EXCLUDED.location_limit,ai_monthly_limit=EXCLUDED.ai_monthly_limit,heatmap_monthly_points=EXCLUDED.heatmap_monthly_points,
    version=customer_marketing_access.version+1,updated_at=now()
   WHERE customer_marketing_access.version=${input.version} RETURNING customer_id
  ), slots AS (
   UPDATE marketing_location_access m SET enabled=(m.business_id=ANY(${input.enabledLocations}::uuid[])) FROM saved s WHERE m.customer_id=s.customer_id
  ), audit AS (
   INSERT INTO marketing_access_audit(customer_id,settings) SELECT customer_id,${JSON.stringify(input)}::jsonb FROM saved
  ) SELECT customer_id FROM saved`;
  if(!rows.length)return NextResponse.json({error:'Access changed or the location selection is invalid. Reload before saving.'},{status:409,headers});
  return NextResponse.json({saved:true,billingActive:false},{headers});
 }catch{return NextResponse.json({error:'Could not save package limits.'},{status:503,headers});}
}
