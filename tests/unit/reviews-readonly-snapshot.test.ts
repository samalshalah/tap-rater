import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {neon,neonConfig} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {bindGoogleLocation,syncLiveReviews,listLiveWorkspaces,saveLiveDraft,approveLiveDraft,publishLiveReply,saveLiveSettings,prepareAutomaticDraft} from '@/lib/google-business/live-reviews';

const enabled=process.env.REVIEWS_READONLY_SNAPSHOT_TEST==='1';
describe.skipIf(!enabled)('Existing location snapshot in isolated QA (no Google network access)',()=>{
 it('imports all pages, preserves review content, isolates accounts, edits drafts and blocks publishing',async()=>{
  const url=process.env.REVIEWS_JOURNEY_DATABASE_URL!;
  const host='ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech';
  if(!url||new URL(url).hostname!==host)throw Error('Dedicated QA database required');
  const fixture=JSON.parse(readFileSync('.local-sandbox/readonly-location.json','utf8'));
  expect(fixture.reviews.length).toBeGreaterThan(0);
  const originalFetch=globalThis.fetch;
  const endpoint=neonConfig.fetchEndpoint;
  const databaseApi=new URL(typeof endpoint==='function'?endpoint(host,5432):endpoint).hostname;
  const blocked:string[]=[];
  vi.stubGlobal('fetch',async(input:any,init?:any)=>{
   const destination=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
   if(destination.hostname!==databaseApi){blocked.push(destination.hostname);throw Error('External network blocked in snapshot test');}
   return originalFetch(input,init);
  });
  vi.stubEnv('DATABASE_URL',url);vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','false');
  const sql=neon(url),uid=randomUUID(),email=`readonly-${uid}@example.test`,actor={kind:'customer' as const,email};
  let customerId='',businessId='',owner='';
  const parent=`accounts/qa/locations/${uid}`;
  const reviews=fixture.reviews.map((r:any)=>({...r,name:parent+'/reviews/'+r.reviewId}));
  const publish=vi.fn(()=>{throw Error('Publishing must never be called');});
  const google={listLocations:vi.fn().mockResolvedValue({locations:[{name:'locations/'+uid,title:fixture.business_name}]}),
   listReviews:vi.fn(async(_parent:string,page?:string)=>({reviews:reviews.slice(Number(page||0),Number(page||0)+10),totalReviewCount:reviews.length,...(Number(page||0)+10<reviews.length?{nextPageToken:String(Number(page||0)+10)}:{})})),publishReply:publish};
  const factory=vi.fn().mockResolvedValue(google);
  try{
   [{id:customerId}]=await sql`INSERT INTO customers(email,name,account_status) VALUES(${email},'Isolated location snapshot QA','active') RETURNING id`;
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit) VALUES(${customerId},'testing','testing',1,0)`;
   [{id:businessId}]=await sql`SELECT create_marketing_business(${customerId}::uuid,${fixture.business_name},'Isolated snapshot only') AS id`;
   owner=`customer:${email}:location:${businessId}`;
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${uid},${email},'not-a-credential','not-a-credential',now()+interval '1 hour','snapshot-only')`;
   await bindGoogleLocation(owner,businessId,'accounts/qa','locations/'+uid,sql,factory,email);
   let more=true,pages=0;
   while(more){if(++pages>100)throw Error('Pagination failed');const result=await syncLiveReviews(actor,businessId,sql,factory);more=result.more;if(more)await sql`UPDATE google_review_links SET checked_at=now()-interval '11 seconds' WHERE business_id=${businessId}`;}
   const [workspace]=await listLiveWorkspaces(actor,sql,[businessId]);
   expect(workspace).toMatchObject({saved_count:reviews.length,initial_import_completed:true});
   const stored=await sql`SELECT id,data,version FROM google_live_reviews WHERE business_id=${businessId}`;
   for(const row of stored)expect(row.data).toEqual(reviews.find((r:any)=>r.reviewId===row.data.reviewId));
   expect(await listLiveWorkspaces({kind:'customer',email:'unrelated@example.test'},sql,[businessId])).toEqual([]);
   const target=stored.find(r=>!r.data.reviewReply?.comment);
   if(!target)throw Error('Snapshot needs an unanswered review for draft checks');
   await expect(saveLiveDraft({kind:'customer',email:'unrelated@example.test'},target.id,'Denied',target.version,sql)).rejects.toMatchObject({status:404});
   const saved=await saveLiveDraft(actor,target.id,'QA ONLY — draft workflow verification; do not publish.',target.version,sql);
   await expect(saveLiveDraft(actor,target.id,'Stale edit',target.version,sql)).rejects.toThrow('changed');
   await approveLiveDraft(actor,target.id,Number(saved.version),sql);
   await expect(publishLiveReply(actor,target.id,Number(saved.version),false,sql,factory)).rejects.toThrow('publishing is locked');
   const [link]=await sql`SELECT * FROM google_review_links WHERE business_id=${businessId}`;
   await expect(saveLiveSettings(actor,{businessId,aiConsent:true,autoEnabled:true,four:true,five:true,style:'friendly',version:Number(link.settings_version),confirmAutomaticPosting:true},sql)).rejects.toThrow('Live publishing');
   expect(await prepareAutomaticDraft(businessId,sql,vi.fn())).toEqual({drafted:false});
   expect(link).toMatchObject({ai_consent:false,auto_enabled:false});expect(publish).not.toHaveBeenCalled();expect(blocked).toEqual([]);
   expect((await sql`SELECT count(*)::int AS total FROM google_live_reviews WHERE business_id=${businessId} AND scheduled_at IS NOT NULL`)[0].total).toBe(0);
   console.log(JSON.stringify({location:fixture.business_name,reviews:reviews.length,pages,publishingCalls:publish.mock.calls.length,externalRequests:blocked.length,source:'stored production review snapshot; Google responses replayed'}));
  }finally{
   if(businessId)await sql`DELETE FROM businesses WHERE id=${businessId}`;
   if(owner)await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;
   if(customerId)await sql`DELETE FROM customers WHERE id=${customerId}`;
   vi.unstubAllGlobals();vi.unstubAllEnvs();
  }
 },60000);
});
