vi.mock('@/lib/business-optimization-feature',()=>({businessOptimizationEnabled:true}));
import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {prepareProfileAgentDraft,saveProfileAgentSettings} from '@/lib/profile-ai-agent';
import {mutateIssue,syncLocationIssues} from '@/lib/local-issues';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('automatic profile drafts on isolated staging',()=>{
 it('isolates clients, honors off and access, deduplicates drafts and recovers interrupted attempts',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Only isolated staging is allowed');
  const sql=neon(url!),customers:string[]=[],owners:string[]=[],locations:string[]=[];
  const generate=vi.fn(async(input:any)=>({summary:`Confirm exceptions for ${input.business}.`,steps:['Ask the owner to confirm upcoming exceptions before saving any hours.'],proposedDescription:'',questions:['Are any exceptions required?']}));
  const prepare=(actor:any,input:any,db:any,_generate:any,version:any)=>mutateIssue(actor,input,db,generate,version);
  try{
   for(let n=0;n<2;n++){
    const owner=`profile-agent-${randomUUID()}@example.test`;owners.push(owner);
    const [c]=await sql`INSERT INTO customers(email,account_status) VALUES(${owner},'active') RETURNING id`;customers.push(c.id);
    await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit) VALUES(${c.id},'testing','testing',2,10)`;
    await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${owner},${owner},'fixture','fixture',now(),'fixture')`;
    for(let k=0;k<2;k++){
     const [b]=await sql`INSERT INTO businesses(customer_id,business_name,status) VALUES(${c.id},${`Client ${n} location ${k}`},'active') RETURNING id`;locations.push(b.id);
     const parent=`accounts/test/locations/${b.id}`;
     await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,profile_ai_enabled) VALUES(${b.id},${c.id},${owner},${owner},${parent},'Fixture',true)`;
     await sql`INSERT INTO google_profile_drafts(business_id,parent,google_subject,observed) VALUES(${b.id},${parent},${owner},${JSON.stringify({description:'A local business.',phone:'123',website:'https://example.test',hours:'Monday 09:00–17:00',categories:'Shop',specialHours:''})}::jsonb)`;
    }
   }
   const [a,b,c,d]=locations;
   await sql`UPDATE google_review_links SET profile_ai_enabled=false WHERE business_id=${b}`;
   expect(await prepareProfileAgentDraft(b,sql,syncLocationIssues,prepare)).toEqual({drafted:false});
   for(const id of [a,c])expect(await prepareProfileAgentDraft(id,sql,syncLocationIssues,prepare)).toEqual({drafted:true,published:false});
   expect(generate).toHaveBeenCalledTimes(2);
   expect(generate.mock.calls.map(call=>call[0].business)).toEqual(['Client 0 location 0','Client 1 location 0']);
   expect(await prepareProfileAgentDraft(a,sql,syncLocationIssues,prepare)).toEqual({drafted:false});
   await syncLocationIssues({kind:'admin'},d,sql);
   await sql`INSERT INTO local_issue_drafts(issue_id,fingerprint,status,attempt_token,attempt_at) SELECT id,fingerprint,'generating',${randomUUID()},now()-interval '4 minutes' FROM local_issues WHERE business_id=${d} AND active`;
   expect(await prepareProfileAgentDraft(d,sql,syncLocationIssues,prepare)).toEqual({drafted:true,published:false});
   const saved=await sql`SELECT i.business_id,d.status,d.approved_at,d.content FROM local_issues i JOIN local_issue_drafts d ON d.issue_id=i.id AND d.fingerprint=i.fingerprint WHERE i.business_id=ANY(${locations}::uuid[])`;
   expect(saved).toHaveLength(3);for(const row of saved){expect(row.status).toBe('draft');expect(row.approved_at).toBeNull();expect(row.content.proposedDescription).toBe('');}
   const profiles=await sql`SELECT draft,version,publish_state,submitted_at FROM google_profile_drafts WHERE business_id=ANY(${locations}::uuid[])`;
   for(const p of profiles){expect(p.draft).toBeNull();expect(p.version).toBe(1);expect(p.submitted_at).toBeNull();expect(p.publish_state).toBe('idle');}
   const [link]=await sql`SELECT settings_version FROM google_review_links WHERE business_id=${b}`;
   await expect(saveProfileAgentSettings({kind:'customer',email:owners[1]},{businessId:b,enabled:true,version:link.settings_version},sql)).rejects.toMatchObject({status:404});
   await saveProfileAgentSettings({kind:'customer',email:owners[0]},{businessId:b,enabled:true,version:link.settings_version},sql);
   const [due]=await sql`SELECT profile_ai_enabled,maintenance_due_at<=now() AS due FROM google_review_links WHERE business_id=${b}`;expect(due).toMatchObject({profile_ai_enabled:true,due:true});
   await sql`UPDATE customer_marketing_access SET status='inactive' WHERE customer_id=${customers[0]}`;
   await expect(prepareProfileAgentDraft(b,sql,syncLocationIssues,prepare)).rejects.toMatchObject({status:404});
   expect(generate).toHaveBeenCalledTimes(3);
  }finally{
   for(const id of customers)await sql`DELETE FROM businesses WHERE customer_id=${id}`;
   for(const owner of owners)await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;
   for(const id of customers)await sql`DELETE FROM customers WHERE id=${id}`;
  }
 },60000);
});

