import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect} from 'vitest';
import {mutateHeatmap,heatmapSnapshot} from '@/lib/heatmap-management';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('isolated heat-map database',()=>{
 it('keeps two branches separate, persists settings, blocks other clients and stale saves',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw new Error('Only isolated staging is allowed');
  const sql=neon(url!),owner=`heatmap-${randomUUID()}@example.test`,other={kind:'customer' as const,email:'other@example.test'},actor={kind:'customer' as const,email:owner};
  const [customer]=await sql`INSERT INTO customers (email,account_status) VALUES (${owner},'active') RETURNING id`;
  try{
   await sql`INSERT INTO google_business_connections (owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES (${owner},${owner},${owner},'test-only','test-only',now(),'test-only')`;
   const businesses=await sql`INSERT INTO businesses (customer_id,business_name,status) VALUES (${customer.id},'Heat-map fixture A','active'),(${customer.id},'Heat-map fixture B','active') RETURNING id`;
   const fake=async()=>({getMapAnchor:async()=>({title:'Fixture',latitude:38.9,longitude:-77,placeId:'test-only'})}) as any;
   for(const b of businesses){await sql`INSERT INTO google_review_links (business_id,customer_id,owner,google_subject,parent,title) VALUES (${b.id},${customer.id},${owner},${owner},${'accounts/test/locations/'+b.id},'Fixture')`;await mutateHeatmap(actor,{action:'initialize',businessId:b.id},sql,fake);}
   const a=businesses[0].id,b=businesses[1].id,settings={keyword:'boutique',size:5,spacingKm:0.5,language:'en'};
   const saved=await mutateHeatmap(actor,{action:'create',businessId:a,settings},sql,fake);
   await mutateHeatmap(actor,{action:'create',businessId:b,settings:{...settings,size:3}},sql,fake);
   expect((await heatmapSnapshot(actor,a,sql)).tracks[0].size).toBe(5);expect((await heatmapSnapshot(actor,b,sql)).tracks[0].size).toBe(3);
   await expect(mutateHeatmap(actor,{action:'create',businessId:a,settings:{...settings,keyword:'BOUTIQUE'}},sql,fake)).rejects.toMatchObject({status:409});
   await expect(heatmapSnapshot(other,a,sql)).rejects.toMatchObject({status:404});
   await expect(mutateHeatmap(other,{action:'create',businessId:a,settings},sql,fake)).rejects.toMatchObject({status:404});
   await expect(mutateHeatmap(actor,{action:'update',businessId:b,id:saved.id,version:1,settings,active:false},sql,fake)).rejects.toMatchObject({status:409});
   await mutateHeatmap(actor,{action:'update',businessId:a,id:saved.id,version:1,settings:{...settings,spacingKm:1},active:false},sql,fake);
   await expect(mutateHeatmap(actor,{action:'update',businessId:a,id:saved.id,version:1,settings,active:true},sql,fake)).rejects.toMatchObject({status:409});
   const result=await heatmapSnapshot(actor,a,sql);expect(result.tracks[0]).toMatchObject({spacingKm:1,active:false,version:2});expect(result.scans).toEqual([]);
  }finally{
   // Remove only this test's disposable fixture account and records on the staging branch.
   await sql`DELETE FROM businesses WHERE customer_id=${customer.id}`;await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;await sql`DELETE FROM customers WHERE id=${customer.id}`;
  }
 },60000);
});
