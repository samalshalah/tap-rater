import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect} from 'vitest';
import {reviewKnowledgeSnapshot,saveReviewKnowledge,replyKnowledgeContext} from '@/lib/review-knowledge';
import {emptyReviewKnowledge} from '@/lib/review-knowledge-data';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('location AI knowledge in isolated database',()=>{
 it('separates locations, preserves drafts and autopilot, rejects stale and unauthorized writes',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Only isolated staging is allowed');
  const sql=neon(url!),email=`knowledge-${randomUUID()}@example.test`,actor={kind:'customer' as const,email};
  const [c]=await sql`INSERT INTO customers(email,account_status) VALUES(${email},'active') RETURNING id`;
  try{
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit) VALUES(${c.id},'testing','testing',2,0)`;
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${email},${email},${email},'fixture','fixture',now(),'fixture')`;
   const bs=await sql`INSERT INTO businesses(customer_id,business_name) VALUES(${c.id},'North'),(${c.id},'South') RETURNING id,business_name`;
   for(const b of bs){await sql`SELECT claim_marketing_location(${b.id}::uuid,${c.id}::uuid)`;const parent=`accounts/test/locations/${b.id}`;
    await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title) VALUES(${b.id},${c.id},${email},${email},${parent},${b.business_name})`;
    await sql`INSERT INTO google_profile_drafts(business_id,parent,google_subject,observed,draft) VALUES(${b.id},${parent},${email},${JSON.stringify({name:b.business_name,phone:'123',hours:'Monday 9–5'})}::jsonb,'{"name":"Unsaved public change"}'::jsonb)`;
   }
   const [a,b]=bs;const snap=await reviewKnowledgeSnapshot(actor,a.id,sql);
   expect(snap.facts?.name).toBe(a.business_name);
   const knowledge={...emptyReviewKnowledge,policies:'Reservations accepted by phone.',rules:'Never promise refunds.',language:'Arabic' as const,length:'detailed' as const,style:'professional' as const};
   expect(await saveReviewKnowledge(actor,{businessId:a.id,version:snap.version,knowledge},sql)).toMatchObject({saved:true,published:false});
   await expect(saveReviewKnowledge(actor,{businessId:a.id,version:snap.version,knowledge},sql)).rejects.toMatchObject({status:409});
   await expect(reviewKnowledgeSnapshot({kind:'customer',email:'other@example.test'},a.id,sql)).rejects.toMatchObject({status:404});
   await expect(saveReviewKnowledge({kind:'customer',email:'other@example.test'},{businessId:a.id,version:2,knowledge},sql)).rejects.toMatchObject({status:404});
   const context=await replyKnowledgeContext(a.id,c.id,sql);
   expect(context.preferences).toEqual(knowledge);expect(context.googleFacts?.name).toBe(a.business_name);expect(JSON.stringify(context)).not.toContain('Unsaved public change');
   expect((await replyKnowledgeContext(b.id,c.id,sql)).preferences.policies).toBe('');
   await expect(replyKnowledgeContext(a.id,randomUUID(),sql)).rejects.toMatchObject({status:404});
   const latest=await reviewKnowledgeSnapshot(actor,a.id,sql);
   await saveReviewKnowledge(actor,{businessId:a.id,version:latest.version,knowledge:{...knowledge,enabled:false}},sql);
   const disabled=await reviewKnowledgeSnapshot(actor,a.id,sql);expect(disabled.knowledge.enabled).toBe(false);expect(disabled.knowledge.policies).toBe(knowledge.policies);
   expect((await reviewKnowledgeSnapshot(actor,b.id,sql)).knowledge.enabled).toBe(true);
   const [saved]=await sql`SELECT auto_enabled,profile_ai_enabled FROM google_review_links WHERE business_id=${a.id}`;expect(saved).toEqual({auto_enabled:false,profile_ai_enabled:false});
   expect((await sql`SELECT draft FROM google_profile_drafts WHERE business_id=${a.id}`)[0].draft.name).toBe('Unsaved public change');
  }finally{await sql`DELETE FROM businesses WHERE customer_id=${c.id}`;await sql`DELETE FROM google_business_connections WHERE owner=${email}`;await sql`DELETE FROM customers WHERE id=${c.id}`;}
 },60000);
});
