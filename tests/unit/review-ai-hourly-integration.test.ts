import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect} from 'vitest';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('rolling hourly AI reservations in isolated storage',()=>{
 it('allows 20, blocks 21, expires old slots, isolates locations and serializes concurrent requests',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Only isolated staging is allowed');
  const sql=neon(url!),email=`hourly-${randomUUID()}@example.test`;
  const [customer]=await sql`INSERT INTO customers(email,account_status) VALUES(${email},'active') RETURNING id`;
  try {
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit) VALUES(${customer.id},'testing','testing',2,100)`;
   const locations=[];
   for(let i=0;i<2;i++){
    const [b]=await sql`INSERT INTO businesses(customer_id,business_name) VALUES(${customer.id},'Hourly limiter test') RETURNING id`;
    locations.push(b.id);
    await sql`SELECT claim_marketing_location(${b.id}::uuid,${customer.id}::uuid)`;
    await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,ai_consent) VALUES(${b.id},${customer.id},${email},${email},${'accounts/test/locations/'+b.id},'Hourly test',true)`;
   }
   const [a,b]=locations;
   for(let i=0;i<20;i++){
    await sql`UPDATE google_review_links SET ai_last_at=NULL WHERE business_id=${a}`;
    const [r]=await sql`SELECT reserve_review_ai_hour(${a}::uuid) AS allowed`;
    expect(r.allowed).toBe(true);
   }
   await sql`UPDATE google_review_links SET ai_last_at=NULL WHERE business_id=${a}`;
   expect((await sql`SELECT reserve_review_ai_hour(${a}::uuid) AS allowed`)[0].allowed).toBe(false);
   expect((await sql`SELECT reserve_review_ai_hour(${b}::uuid) AS allowed`)[0].allowed).toBe(true);
   // One expired reservation releases one slot, even with today's count already at 20.
   await sql`UPDATE google_review_links SET ai_hour_reservations[1]=now()-interval '61 minutes' WHERE business_id=${a}`;
   expect((await sql`SELECT reserve_review_ai_hour(${a}::uuid) AS allowed`)[0].allowed).toBe(true);
   await sql`UPDATE google_review_links SET ai_last_at=NULL,ai_hour_reservations=ai_hour_reservations[1:19] WHERE business_id=${a}`;
   const concurrent=await Promise.all(Array.from({length:8},()=>sql`SELECT reserve_review_ai_hour(${a}::uuid) AS allowed`));
   expect(concurrent.filter(r=>r[0].allowed)).toHaveLength(1);
   const [state]=await sql`SELECT cardinality(ai_hour_reservations) AS slots,ai_calls FROM google_review_links WHERE business_id=${a}`;
   expect(state.slots).toBe(20);expect(state.ai_calls).toBe(22);
   await sql`UPDATE google_review_links SET ai_consent=false,ai_last_at=NULL WHERE business_id=${b}`;
   expect((await sql`SELECT reserve_review_ai_hour(${b}::uuid) AS allowed`)[0].allowed).toBe(false);
  } finally {
   await sql`DELETE FROM google_review_links WHERE customer_id=${customer.id}`;
   await sql`DELETE FROM businesses WHERE customer_id=${customer.id}`;
   await sql`DELETE FROM customers WHERE id=${customer.id}`;
  }
 },60000);
});
