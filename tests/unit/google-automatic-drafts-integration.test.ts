import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {prepareAutomaticDraft} from '@/lib/google-business/live-reviews';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('automatic drafts on isolated database',()=>{
 it('claims once, saves an unapproved negative-review draft and preserves existing work',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Only isolated staging is allowed');
  const sql=neon(url!),uid=randomUUID(),owner='test-draft:'+uid;
  const [customer]=await sql`INSERT INTO customers(email,account_status) VALUES (${uid+'@example.test'},'active') RETURNING id`;
  let business:string|undefined;
  try{
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES (${owner},${uid},${uid+'@example.test'},'test-only','test-only',now(),'test-only')`;
   const [b]=await sql`INSERT INTO businesses(customer_id,business_name) VALUES (${customer.id},'Synthetic draft test') RETURNING id`;business=b.id;
   await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,ai_consent) VALUES (${business},${customer.id},${owner},${uid},${'accounts/test/locations/'+uid},'Synthetic draft test',true)`;
   const [r]=await sql`INSERT INTO google_live_reviews(business_id,resource,data) VALUES (${business},${uid+'/r1'},${JSON.stringify({reviewId:'r1',starRating:'ONE',comment:'Synthetic test: long wait.'})}::jsonb) RETURNING id`;
   await sql`INSERT INTO google_live_reviews(business_id,resource,data,draft,approved_version) VALUES (${business},${uid+'/r2'},'{}'::jsonb,'Human approved text',1)`;
   await sql`INSERT INTO google_live_reviews(business_id,resource,data) VALUES (${business},${uid+'/r3'},' {"reviewReply":{"comment":"Already replied"}}'::jsonb)`;
   const generate=vi.fn().mockResolvedValue({friendly:'Thank you for your feedback about the wait.',professional:'Thank you for your feedback.',personal:'Thank you for telling us.',short:'Thank you.'});
   const results=await Promise.all([prepareAutomaticDraft(business!,sql,generate),prepareAutomaticDraft(business!,sql,generate)]);
   expect(results.filter(r=>r.drafted)).toHaveLength(1);expect(generate).toHaveBeenCalledTimes(1);
   const saved=await sql`SELECT draft,approved_version,attempted_at,draft_generated_at FROM google_live_reviews WHERE id=${r.id}`;
   expect(saved[0].draft).toContain('wait');expect(saved[0].approved_version).toBeNull();expect(saved[0].attempted_at).toBeNull();expect(saved[0].draft_generated_at).toBeTruthy();
   expect((await prepareAutomaticDraft(business!,sql,generate)).drafted).toBe(false);
   const [manual]=await sql`SELECT draft,approved_version FROM google_live_reviews WHERE resource=${uid+'/r2'}`;expect(manual.draft).toBe('Human approved text');expect(manual.approved_version).toBe(1);
  }finally{if(business)await sql`DELETE FROM businesses WHERE id=${business}`;await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;await sql`DELETE FROM customers WHERE id=${customer.id}`;}
 },60000);
});
