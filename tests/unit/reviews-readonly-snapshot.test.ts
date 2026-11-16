import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {neon,neonConfig} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
const onboarding=vi.hoisted(()=>({email:'',factory:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:async()=>({session:{email:onboarding.email}})}));
vi.mock('@/lib/google-business/live-reviews',async(importOriginal)=>{
 const actual=await importOriginal<typeof import('@/lib/google-business/live-reviews')>();
 return {...actual,syncLiveReviews:(actor:Parameters<typeof actual.syncLiveReviews>[0],id:string)=>actual.syncLiveReviews(actor,id,actual.liveDb(),onboarding.factory)};
});
import {bindGoogleLocation,listLiveWorkspaces,saveLiveDraft,approveLiveDraft,publishLiveReply,saveLiveSettings,prepareAutomaticDraft} from '@/lib/google-business/live-reviews';
import {GET,POST} from '@/app/api/account/onboarding/route';

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
   const headers=new Headers(init?.headers);
   const connection=headers.get('Neon-Connection-String');
   if(destination.protocol!=='https:'||destination.hostname!==databaseApi||destination.pathname!=='/sql'||connection!==url){blocked.push(destination.hostname);throw Error('Only the exact QA database is allowed in snapshot test');}
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
  onboarding.email=email;onboarding.factory.mockImplementation(factory);
  const request=(body?:unknown)=>new Request('https://taprater.com/api/account/onboarding',body?{method:'POST',headers:{origin:'https://taprater.com'},body:JSON.stringify(body)}:undefined);
  const state=async()=>{const response=await GET(request());expect(response.status).toBe(200);return response.json();};
  const action=async(body:unknown,status=200)=>{const response=await POST(request(body));expect(response.status).toBe(status);return response.json();};
  try{
   [{id:customerId}]=await sql`INSERT INTO customers(email,name,account_status) VALUES(${email},'Isolated location snapshot QA','active') RETURNING id`;
   expect((await GET(request())).status).toBe(403);
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit) VALUES(${customerId},'testing','testing',1,0)`;
   expect(await state()).toMatchObject({completed:null,business_id:null});
   const chosen=await action({action:'choose',name:fixture.business_name,address:'Isolated snapshot only'});
   businessId=chosen.business_id;expect(businessId).toBeTruthy();
   // Repeating setup cannot create a second location or overwrite the first selection.
   expect((await action({action:'choose',name:'Repeated selection',address:'QA'})).business_id).toBe(businessId);
   expect((await state()).business_name).toBe(fixture.business_name);
   await action({action:'finish'},400);
   owner=`customer:${email}:location:${businessId}`;
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${uid},${email},'not-a-credential','not-a-credential',now()+interval '1 hour','snapshot-only')`;
   await bindGoogleLocation(owner,businessId,'accounts/qa','locations/'+uid,sql,factory,email);
   const connected=await state();
   expect(connected).toMatchObject({connected:true,completed:null,synced_at:null});
   const importStates=[];
   await action({action:'finish'},400);
   let more=true,pages=0;
   while(more){
    if(++pages>100)throw Error('Pagination failed');
    const progress=await action({action:'import'});more=Boolean(progress.next_page);
    importStates.push(progress);
    expect(progress.completed).toBeNull();
    if(more){await action({action:'finish'},400);expect((await state()).next_page).toBe(progress.next_page);await sql`UPDATE google_review_links SET checked_at=now()-interval '11 seconds' WHERE business_id=${businessId}`;}
   }
   const finished=await action({action:'finish'});
   expect(finished.completed).toBeTruthy();expect(finished.review_count).toBe(reviews.length);
   expect(await state()).toMatchObject({completed:finished.completed,review_count:reviews.length,next_page:null,last_error:null});
   const reads=google.listReviews.mock.calls.length;
   await action({action:'import'});expect(google.listReviews.mock.calls.length).toBe(reads);
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
   writeFileSync('.local-sandbox/qa-onboarding-states.json',JSON.stringify({connected,importStates,finished}));
   console.log(JSON.stringify({location:fixture.business_name,reviews:reviews.length,pages,onboardingCompleted:true,publishingCalls:publish.mock.calls.length,externalRequests:blocked.length,source:fixture.source||'stored review snapshot',fetched_at:fixture.fetched_at||null,googleResponses:'replayed into isolated QA database'}));
  }finally{
   if(businessId)await sql`DELETE FROM businesses WHERE id=${businessId}`;
   if(owner)await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;
   if(customerId)await sql`DELETE FROM customers WHERE id=${customerId}`;
   if(customerId)expect(await sql`SELECT id FROM customers WHERE id=${customerId}`).toHaveLength(0);
   if(businessId){expect(await sql`SELECT id FROM businesses WHERE id=${businessId}`).toHaveLength(0);expect(await sql`SELECT id FROM google_live_reviews WHERE business_id=${businessId}`).toHaveLength(0);}
   if(owner)expect(await sql`SELECT owner FROM google_business_connections WHERE owner=${owner}`).toHaveLength(0);
   console.log(JSON.stringify({cleanup:'verified',remainingOwnedRows:0}));
   vi.unstubAllGlobals();vi.unstubAllEnvs();
  }
 },60000);
});
