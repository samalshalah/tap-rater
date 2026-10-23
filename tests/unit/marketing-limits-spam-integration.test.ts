import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {flagLiveReview,suggestLiveReply,approveLiveDraft,prepareAutomaticDraft,syncLiveReviews} from '@/lib/google-business/live-reviews';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('marketing limits and private spam flags',()=>{
 it('enforces atomic limits, expiry, location isolation and spam exclusion without external calls',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Only isolated staging is allowed');
  const sql=neon(url!),email=`limits-${randomUUID()}@example.test`,actor={kind:'customer' as const,email};
  const [c]=await sql`INSERT INTO customers(email,account_status) VALUES(${email},'active') RETURNING id`;
  try{
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit,heatmap_monthly_points) VALUES(${c.id},'testing','testing',1,2,3)`;
   const locations=await sql`INSERT INTO businesses(customer_id,business_name) VALUES(${c.id},'Test North'),(${c.id},'Test South') RETURNING id`;
   const [a,b]=locations.map(l=>String(l.id));
   const claims=await Promise.all([a,b].map(id=>sql`SELECT claim_marketing_location(${id}::uuid,${c.id}::uuid) AS allowed`));
   expect(claims.filter(r=>r[0].allowed)).toHaveLength(1);
   await sql`UPDATE customer_marketing_access SET location_limit=2 WHERE customer_id=${c.id}`;
   for(const id of [a,b])expect((await sql`SELECT claim_marketing_location(${id}::uuid,${c.id}::uuid) AS allowed`)[0].allowed).toBe(true);
   const concurrent=await Promise.all(Array.from({length:8},()=>sql`SELECT reserve_marketing_units(${a}::uuid,'ai',1,${randomUUID()}) AS allowed`));
   expect(concurrent.filter(r=>r[0].allowed)).toHaveLength(2);
   expect((await sql`SELECT reserve_marketing_units(${b}::uuid,'ai',1,'one') AS allowed`)[0].allowed).toBe(true);
   expect((await sql`SELECT reserve_marketing_units(${b}::uuid,'ai',1,'one') AS allowed`)[0].allowed).toBe(true);
   expect((await sql`SELECT sum(units)::int AS used FROM marketing_usage_reservations WHERE business_id=${b} AND service='ai'`)[0].used).toBe(1);
   expect((await sql`SELECT reserve_marketing_units(${a}::uuid,'heatmap',4,'too-large') AS allowed`)[0].allowed).toBe(false);
   expect((await sql`SELECT reserve_marketing_units(${a}::uuid,'heatmap',3,'allowed') AS allowed`)[0].allowed).toBe(true);
   await sql`UPDATE customer_marketing_access SET expires_at=now()-interval '1 second' WHERE customer_id=${c.id}`;
   expect((await sql`SELECT reserve_marketing_units(${b}::uuid,'ai',1,'expired') AS allowed`)[0].allowed).toBe(false);
   await sql`UPDATE customer_marketing_access SET expires_at=NULL WHERE customer_id=${c.id}`;
   await sql`UPDATE marketing_location_access SET enabled=false WHERE business_id=${b}`;
   expect((await sql`SELECT reserve_marketing_units(${b}::uuid,'ai',1,'disabled') AS allowed`)[0].allowed).toBe(false);
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${email},${email},${email},'fixture','fixture',now(),'fixture')`;
   const parent=`accounts/test/locations/${a}`;
   await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,ai_consent) VALUES(${a},${c.id},${email},${email},${parent},'Test North',true)`;
   const data={reviewId:'spam-test',name:parent+'/reviews/spam-test',starRating:'THREE',comment:'Synthetic review',createTime:new Date().toISOString()};
   const [r]=await sql`INSERT INTO google_live_reviews(business_id,resource,data,draft) VALUES(${a},${data.name},${JSON.stringify(data)}::jsonb,'Preserve this draft') RETURNING id,version`;
   await expect(flagLiveReview({kind:'customer',email:'other@example.test'},r.id,true,r.version,sql)).rejects.toThrow();
   expect(await flagLiveReview(actor,r.id,true,r.version,sql)).toMatchObject({flagged:true,published:false});
   const generate=vi.fn();
   await expect(suggestLiveReply(actor,r.id,sql,generate)).rejects.toThrow('suspected spam');
   await expect(approveLiveDraft(actor,r.id,r.version+1,sql)).rejects.toThrow('suspected spam');
   expect(await prepareAutomaticDraft(a,sql,generate)).toEqual({drafted:false});expect(generate).not.toHaveBeenCalled();
   const google={listReviews:vi.fn().mockResolvedValue({reviews:[data]})};
   await syncLiveReviews(actor,a,sql,async()=>google as any);
   const [saved]=await sql`SELECT suspected_spam,draft,version FROM google_live_reviews WHERE id=${r.id}`;
   expect(saved.suspected_spam).toBe(true);expect(saved.draft).toBe('Preserve this draft');
   await expect(flagLiveReview(actor,r.id,false,r.version,sql)).rejects.toThrow('changed');
   expect(await flagLiveReview(actor,r.id,false,saved.version,sql)).toMatchObject({flagged:false});
   expect((await sql`SELECT approved_version FROM google_live_reviews WHERE id=${r.id}`)[0].approved_version).toBeNull();
  }finally{
   await sql`DELETE FROM businesses WHERE customer_id=${c.id}`;
   await sql`DELETE FROM google_business_connections WHERE owner=${email}`;
   await sql`DELETE FROM customers WHERE id=${c.id}`;
  }
 },120000);
});
