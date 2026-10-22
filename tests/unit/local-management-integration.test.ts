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
   const profile={action:'updateLocation',businessId:first.id,name:'Updated branch',address:'New address',phone:'5551234567',website:'https://example.com',category:'Boutique',description:'Test description',hours:'Mon-Fri 9-5',version:1};
   await expect(mutateLocal(other,profile,sql)).rejects.toMatchObject({status:409});
   await mutateLocal(actor,profile,sql);
   await expect(mutateLocal(actor,profile,sql)).rejects.toMatchObject({status:409});
   expect((await localSnapshot(actor,sql)).locations.find(l=>l.id===second.id)?.business_name).toBe('Integration test branch 2');
   const advance={action:'advanceListing',businessId:first.id,directory:record.directory,version:2,profileVersion:2,state:'approved'};
   await expect(mutateLocal(actor,advance,sql)).rejects.toMatchObject({status:409}); // Not checked yet.
   await mutateLocal(actor,{...record,version:2,checked:true,notes:'Use updated branch profile'},sql);
   await expect(mutateLocal(other,{...advance,version:3},sql)).rejects.toMatchObject({status:409});
   await expect(mutateLocal(actor,{...advance,version:3,profileVersion:1},sql)).rejects.toMatchObject({status:409});
   await mutateLocal(actor,{...advance,version:3},sql);
   await mutateLocal(actor,{...profile,version:2,address:'Changed again'},sql);
   await expect(mutateLocal(actor,{...advance,version:4,profileVersion:3,state:'submitted'},sql)).rejects.toMatchObject({status:409});
   await mutateLocal(actor,{...record,version:4,checked:true,notes:'Updated correction'},sql);
   await mutateLocal(actor,{...advance,version:5,profileVersion:3},sql);
   await mutateLocal(actor,{...advance,version:6,profileVersion:3,state:'submitted'},sql);
   await mutateLocal(actor,{...advance,version:7,profileVersion:3,state:'resolved'},sql);
   expect((await localSnapshot(actor,sql)).listings[0].correction_state).toBe('resolved');
   await sql`UPDATE businesses SET customer_id=${customers.find(c=>c.email===b)!.id} WHERE id=${first.id}`;
   expect((await localSnapshot(other,sql)).listings).toHaveLength(0);
   await expect(mutateLocal(other,{...record,version:2},sql)).rejects.toMatchObject({status:409});
  } finally {
   // Only disposable fixture accounts created by this test are removed.
   for(const c of customers){await sql`DELETE FROM businesses WHERE customer_id=${c.id}`;await sql`DELETE FROM customers WHERE id=${c.id}`;}
  }
 },60000);
});
