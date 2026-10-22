import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {runHeatmapMaintenance} from '@/lib/heatmap-scans';
import {heatmapSnapshot} from '@/lib/heatmap-management';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('DataForSEO staging budget and scheduling',()=>{
 it('serializes concurrent reservations, preserves uncertain charges, separates tenants and deduplicates periods',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw new Error('Only isolated staging is allowed');
  const sql=neon(url!),owner=`rank-${randomUUID()}@example.test`;
  const [original]=await sql`SELECT * FROM local_rank_provider WHERE id=true`;
  const [customer]=await sql`INSERT INTO customers(email,account_status) VALUES(${owner},'active') RETURNING id`;
  const [month]=await sql`SELECT date_trunc('month',now() AT TIME ZONE 'America/New_York')::date::text AS month`;
  const [prior]=await sql`SELECT reserved_microusd FROM local_rank_budgets WHERE month=${month.month}::date`;
  vi.stubEnv('DATAFORSEO_LOGIN','fixture');vi.stubEnv('DATAFORSEO_PASSWORD','fixture');
  try{
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${owner},${owner},'fixture','fixture',now(),'fixture')`;
   const locations=await sql`INSERT INTO businesses(customer_id,business_name,status) VALUES(${customer.id},'Rank fixture A','active'),(${customer.id},'Rank fixture B','active') RETURNING id`;
   for(const b of locations){
    const parent=`accounts/fixture/locations/${b.id}`;
    await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title) VALUES(${b.id},${customer.id},${owner},${owner},${parent},'Fixture')`;
    await sql`INSERT INTO local_heatmap_locations(business_id,customer_id,parent,google_subject,anchor) VALUES(${b.id},${customer.id},${parent},${owner},${JSON.stringify({latitude:38.9,longitude:-77,placeId:'fixture',title:'Fixture'})}::jsonb)`;
    await sql`INSERT INTO local_heatmap_tracks(business_id,customer_id,parent,google_subject,slot,keyword,settings) VALUES(${b.id},${customer.id},${parent},${owner},1,'boutique',${JSON.stringify({keyword:'boutique',size:3,spacingKm:0.5,language:'en'})}::jsonb)`;
    await sql`INSERT INTO local_rank_schedules(business_id,customer_id,parent,google_subject,enabled) VALUES(${b.id},${customer.id},${parent},${owner},true)`;
   }
   await sql`UPDATE local_rank_provider SET enabled=true,halt_reason=NULL,monthly_cap_microusd=${Number(prior?.reserved_microusd||0)+3000} WHERE id=true`;
   const provider={submit:vi.fn().mockRejectedValue(new Error('unknown network outcome')),collect:vi.fn()};
   await Promise.all([runHeatmapMaintenance(sql,provider),runHeatmapMaintenance(sql,provider)]);
   const points=await sql`SELECT p.* FROM local_rank_points p JOIN local_rank_runs r ON r.id=p.run_id WHERE r.customer_id=${customer.id}`;
   expect(points).toHaveLength(18);expect(points.filter(p=>p.state==='uncertain')).toHaveLength(5);expect(points.filter(p=>p.state==='queued')).toHaveLength(13);
   expect(points.reduce((sum,p)=>sum+p.reserved_microusd,0)).toBe(3000);
   await runHeatmapMaintenance(sql,provider);expect(provider.submit).toHaveBeenCalledTimes(1);
   const runs=await sql`SELECT id FROM local_rank_runs WHERE customer_id=${customer.id}`;expect(runs).toHaveLength(2);
   const own=await heatmapSnapshot({kind:'customer',email:owner},locations[0].id,sql);expect(own.scans).toHaveLength(1);expect(own.scans[0].points).toHaveLength(9);expect(own.provider.status).toBe('capped');
   await expect(heatmapSnapshot({kind:'customer',email:'other@example.test'},locations[0].id,sql)).rejects.toMatchObject({status:404});
   const [budget]=await sql`SELECT reserved_microusd FROM local_rank_budgets WHERE month=${month.month}::date`;expect(Number(budget.reserved_microusd)).toBe(Number(prior?.reserved_microusd||0)+3000);
  }finally{
   vi.unstubAllEnvs();
   await sql`UPDATE local_rank_provider SET enabled=${original.enabled},monthly_cap_microusd=${original.monthly_cap_microusd},halt_reason=${original.halt_reason} WHERE id=true`;
   await sql`UPDATE local_rank_budgets SET reserved_microusd=${prior?.reserved_microusd||0} WHERE month=${month.month}::date`;
   await sql`DELETE FROM businesses WHERE customer_id=${customer.id}`;await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;await sql`DELETE FROM customers WHERE id=${customer.id}`;
  }
 },60000);
});
