import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect} from 'vitest';
describe.skipIf(!process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL)('internal unlimited locations',()=>{
 it('bypasses only location count and retains ownership and usage checks',async()=>{
  const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL!;
  if(!new URL(url).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Isolated staging required');
  const sql=neon(url);
  const accounts=await sql`INSERT INTO customers(email,account_status) VALUES(${randomUUID()+'@example.test'},'active'),(${randomUUID()+'@example.test'},'active') RETURNING id`;
  const [a,b]=accounts.map(x=>x.id);
  try{
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,unlimited_locations,ai_monthly_limit) VALUES(${a},'active','manual',0,true,1),(${b},'active','manual',0,false,1)`;
   const locations=await sql`INSERT INTO businesses(customer_id,business_name) VALUES(${a},'QA A'),(${a},'QA B'),(${b},'QA other') RETURNING id,customer_id`;
   for(const l of locations.filter(x=>x.customer_id===a))expect((await sql`SELECT claim_marketing_location(${l.id}::uuid,${a}::uuid) AS ok`)[0].ok).toBe(true);
   const other=locations.find(x=>x.customer_id===b)!;
   expect((await sql`SELECT claim_marketing_location(${other.id}::uuid,${a}::uuid) AS ok`)[0].ok).toBe(false);
   expect((await sql`SELECT claim_marketing_location(${other.id}::uuid,${b}::uuid) AS ok`)[0].ok).toBe(false);
   const own=locations.find(x=>x.customer_id===a)!;
   expect((await sql`SELECT reserve_marketing_units(${own.id}::uuid,'ai',2,'over-limit') AS ok`)[0].ok).toBe(false);
  }finally{for(const c of accounts){await sql`DELETE FROM businesses WHERE customer_id=${c.id}`;await sql`DELETE FROM customers WHERE id=${c.id}`;}}
 },30000);
});
