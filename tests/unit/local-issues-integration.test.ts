import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {localIssueSnapshot,mutateIssue,syncLocationIssues} from '@/lib/local-issues';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('location notification ownership and draft-only AI',()=>{
 it('isolates locations, gates previews, deduplicates drafts and preserves the Google profile',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw new Error('Only isolated staging is allowed');
  const sql=neon(url!),owner=`issues-${randomUUID()}@example.test`,actor={kind:'customer' as const,email:owner};
  const [customer]=await sql`INSERT INTO customers(email,account_status) VALUES(${owner},'active') RETURNING id`;
  try{
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit) VALUES(${customer.id},'testing','testing',2,10)`;
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${owner},${owner},'fixture','fixture',now(),'fixture')`;
   const locations=await sql`INSERT INTO businesses(customer_id,business_name,status) VALUES(${customer.id},'Issue A','active'),(${customer.id},'Issue B','active') RETURNING id`;
   for(const b of locations){
    const parent=`accounts/test/locations/${b.id}`;
    await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title) VALUES(${b.id},${customer.id},${owner},${owner},${parent},'Fixture')`;
    await sql`INSERT INTO google_profile_drafts(business_id,parent,google_subject,observed) VALUES(${b.id},${parent},${owner},${JSON.stringify({description:'Boutique',phone:'',website:'',hours:'',categories:'Boutique'})}::jsonb)`;
    await sql`INSERT INTO local_issue_access(business_id,customer_id,parent,google_subject) VALUES(${b.id},${customer.id},${parent},${owner})`;
   }
   const a=locations[0].id,b=locations[1].id;
   await syncLocationIssues(actor,a,sql);
   const snapshot=await localIssueSnapshot(actor,a,sql);expect(snapshot.errors).toEqual([]);expect(snapshot.issues).toHaveLength(1);
   expect((await localIssueSnapshot({kind:'customer',email:'other@example.test'},a,sql)).issues).toEqual([]);
   const issue=snapshot.issues[0],input={businessId:a,id:issue.id,fingerprint:issue.fingerprint};
   const generate=vi.fn().mockResolvedValue({summary:'Confirm missing facts.',steps:['Provide the actual opening hours.'],proposedDescription:'',questions:['What are your hours?']});
   await expect(mutateIssue(actor,{...input,businessId:b,action:'preview'},sql,generate)).rejects.toThrow();
   await sql`UPDATE customer_marketing_access SET ai_monthly_limit=0 WHERE customer_id=${customer.id}`;
   await expect(mutateIssue(actor,{...input,action:'preview'},sql,generate)).rejects.toMatchObject({status:429});expect(generate).not.toHaveBeenCalled();
   expect(await mutateIssue(actor,{...input,action:'request'},sql,generate)).toMatchObject({charged:false});
   await sql`UPDATE customer_marketing_access SET ai_monthly_limit=10 WHERE customer_id=${customer.id}`;
   await sql`UPDATE local_issue_access SET ai_last_at=NULL WHERE business_id=${a}`;
   expect(await mutateIssue(actor,{...input,action:'preview'},sql,generate)).toMatchObject({charged:false,published:false});
   await mutateIssue(actor,{...input,action:'preview'},sql,generate);expect(generate).toHaveBeenCalledTimes(1);
   expect(await mutateIssue(actor,{...input,action:'approveDraft'},sql,generate)).toMatchObject({published:false});
   const [profile]=await sql`SELECT draft,version FROM google_profile_drafts WHERE business_id=${a}`;expect(profile.draft).toBeNull();expect(profile.version).toBe(1);
   await sql`UPDATE google_profile_drafts SET observed=observed||'{"hours":"Sunday 12–6"}'::jsonb WHERE business_id=${a}`;
   await expect(mutateIssue(actor,{...input,action:'preview'},sql,generate)).rejects.toThrow('notification changed');
   expect((await localIssueSnapshot(actor,b,sql)).issues[0].draft).toBeNull();
  }finally{await sql`DELETE FROM businesses WHERE customer_id=${customer.id}`;await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;await sql`DELETE FROM customers WHERE id=${customer.id}`;}
 },60000);
});
