import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {checkNextReviewPolicy} from '@/lib/review-policy-worker';
const url=process.env.REVIEW_POLICY_TEST_DATABASE_URL;
describe.skipIf(!url)('policy cache on isolated database',()=>{
 it('claims each text once, skips ratings, isolates locations and rechecks changed content',async()=>{
  expect(new URL(url!).hostname).toContain('ep-morning-meadow-at5tmqst');
  const sql=neon(url!),id=randomUUID(),customer=randomUUID(),owner='policy-test:'+id;
  await sql`INSERT INTO customers(id,email,account_status) VALUES(${customer},${customer+'@example.test'},'active')`;
  try{
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit) VALUES(${customer},'testing','testing',1)`;
   await sql`INSERT INTO businesses(id,customer_id,business_name) VALUES(${id},${customer},'Policy fixture')`;
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},'test','test@example.test','fake','fake',now(),'fake')`;
   await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,ai_consent) VALUES(${id},${customer},${owner},'test',${'accounts/test/locations/'+id},'Fixture',true)`;
   await sql`INSERT INTO google_live_reviews(business_id,resource,data) VALUES
    (${id},${id+'/text'},'{"starRating":"ONE","comment":"Slow service"}'),
    (${id},${id+'/rating'},'{"starRating":"TWO"}'),
    (${id},${id+'/positive'},'{"starRating":"FIVE","comment":"Great"}')`;
   const run=vi.fn().mockResolvedValue({response:{finding:'no_issue'}});
   const checked=await Promise.all([checkNextReviewPolicy(sql,id,run),checkNextReviewPolicy(sql,id,run)]);
   expect(checked.sort()).toEqual([false,true]);
   expect(run).toHaveBeenCalledTimes(1);
   expect(await checkNextReviewPolicy(sql,id,run)).toBe(false);
   const [before]=await sql`SELECT draft,attempted_at,suspected_spam,policy_check FROM google_live_reviews WHERE resource=${id+'/text'}`;
   expect(before).toEqual({draft:'',attempted_at:null,suspected_spam:false,policy_check:{finding:'no_issue'}});
   await sql`UPDATE google_live_reviews SET data=jsonb_set(data,'{comment}','"Changed review"') WHERE resource=${id+'/text'}`;
   expect(await checkNextReviewPolicy(sql,id,run)).toBe(true);
   expect(run).toHaveBeenCalledTimes(2);
   expect((await sql`SELECT count(*)::int AS n FROM marketing_usage_reservations WHERE business_id=${id}`)[0].n).toBe(0);
  }finally{
   await sql`DELETE FROM businesses WHERE id=${id}`;
   await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;
   await sql`DELETE FROM customers WHERE id=${customer}`;
  }
 },60000);
});
