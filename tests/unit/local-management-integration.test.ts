import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect} from 'vitest';
import {localSnapshot,mutateLocal} from '@/lib/local-management';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('isolated local management database',()=>{
 it('isolates accounts, supports multiple locations and prevents stale overwrite',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw new Error('Only the isolated staging branch is allowed.');
  const sql=neon(url!);const suffix=randomUUID();const a=`local-a-${suffix}@example.test`,b=`local-b-${suffix}@example.test`;
  const customers=await sql`INSERT INTO customers (email,account_status) VALUES (${a},'active'),(${b},'active') RETURNING id,email`;
  try {
   const actor={kind:'customer' as const,email:a};const other={kind:'customer' as const,email:b};
   const input={action:'createLocation',name:'Integration test branch',address:'Test address',phone:'',website:''};
   const first=await mutateLocal(actor,input,sql);const second=await mutateLocal(actor,{...input,name:'Integration test branch 2'},sql);
   const own=await localSnapshot(actor,sql);expect(own.locations.map(l=>l.id)).toEqual(expect.arrayContaining([first.id,second.id]));expect(own.locations).toHaveLength(2);
   expect((await localSnapshot(other,sql)).locations).toHaveLength(0);
   const record={action:'saveListing',businessId:first.id,directory:'Example directory',status:'needs_update',listingUrl:'https://example.com/',listedName:'Test',listedAddress:'',listedPhone:'',notes:'Correction draft',version:0};
   await mutateLocal(actor,record,sql);
   await expect(mutateLocal(other,{...record,version:1},sql)).rejects.toMatchObject({status:409});
   expect((await localSnapshot(other,sql)).listings).toHaveLength(0);
   await mutateLocal(actor,{...record,version:1,notes:'Updated'},sql);
   await expect(mutateLocal(actor,{...record,version:1,notes:'Stale'},sql)).rejects.toMatchObject({status:409});
   const final=await localSnapshot(actor,sql);expect(final.listings).toHaveLength(1);expect(final.listings[0].notes).toBe('Updated');expect(final.listings[0].business_id).toBe(first.id);
   await sql`UPDATE businesses SET customer_id=${customers.find(c=>c.email===b)!.id} WHERE id=${first.id}`;
   expect((await localSnapshot(other,sql)).listings).toHaveLength(0);
   await expect(mutateLocal(other,{...record,version:2},sql)).rejects.toMatchObject({status:409});
  } finally {
   // Only disposable fixture accounts created by this test are removed.
   for(const c of customers){await sql`DELETE FROM businesses WHERE customer_id=${c.id}`;await sql`DELETE FROM customers WHERE id=${c.id}`;}
  }
 },60000);
});
