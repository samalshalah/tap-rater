import {NextResponse} from 'next/server';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-review-core';

export const dynamic='force-dynamic';
export async function GET(){
  const denied=await requireAdminApi();
  if(denied)return denied;
  const headers={'Cache-Control':'private, no-store'};
  try{
    const sql=liveDb();
    const accounts=await sql`SELECT c.id, coalesce(nullif(c.name,''),'Client account') AS name,c.email,
      coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.business_name) ORDER BY b.business_name,b.id)
        FILTER (WHERE b.id IS NOT NULL),'[]'::jsonb) AS locations
      FROM customers c LEFT JOIN businesses b ON b.customer_id=c.id AND b.status IS DISTINCT FROM 'marketing_removed'
      WHERE c.account_status IS DISTINCT FROM 'guest'
      GROUP BY c.id ORDER BY lower(c.email),c.id`;
    return NextResponse.json(accounts,{headers});
  }catch{
    return NextResponse.json({error:'Client directory unavailable.'},{status:503,headers});
  }
}
