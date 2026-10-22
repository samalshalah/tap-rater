import {NextResponse} from 'next/server';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {scenarioInput} from '@/lib/pricing-scenarios';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const denied=await requireAdminApi();if(denied)return denied;
 try{
  const rows=await liveDb()`SELECT id,name,model_version,plans,created_at FROM admin_pricing_scenarios ORDER BY created_at DESC,id DESC LIMIT 100`;
  return NextResponse.json({scenarios:rows.map(r=>({id:r.id,name:r.name,modelVersion:r.model_version,plans:r.plans,createdAt:r.created_at}))},{headers});
 }catch{return NextResponse.json({error:'Saved scenarios are temporarily unavailable.'},{status:503,headers});}
}
export async function POST(request:Request){
 const denied=await requireAdminApi();if(denied)return denied;
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
 let input;
 try{const text=await request.text();if(text.length>12000)throw new Error();input=scenarioInput.parse(JSON.parse(text));}
 catch{return NextResponse.json({error:'Enter a name and valid planning assumptions.'},{status:400,headers});}
 try{
  const sql=liveDb();
  const [row]=await sql`INSERT INTO admin_pricing_scenarios(id,name,model_version,plans)
   VALUES(${input.id}::uuid,${input.name},${input.modelVersion},${JSON.stringify(input.plans)}::jsonb)
   ON CONFLICT(id) DO NOTHING RETURNING id`;
  if(!row){
   const [existing]=await sql`SELECT id FROM admin_pricing_scenarios WHERE id=${input.id}::uuid AND name=${input.name} AND model_version=${input.modelVersion} AND plans=${JSON.stringify(input.plans)}::jsonb`;
   if(!existing)return NextResponse.json({error:'Scenario changed during retry. Save it as a new scenario.'},{status:409,headers});
  }
  return NextResponse.json({saved:true,id:input.id},{status:row?201:200,headers});
 }catch{return NextResponse.json({error:'Could not confirm save. Retry to check the same scenario without duplicating it.'},{status:503,headers});}
}
