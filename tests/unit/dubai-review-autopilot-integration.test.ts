import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {prepareAutomaticDraft,publishLiveReply,olderReviews,syncLiveReviews,queueHistoricalPositives,scheduleSavedReply} from '@/lib/google-business/live-reviews';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
const styles={friendly:'Thank you for sharing your experience with Dubai Shawarma & Cafe.',professional:'Thank you for your feedback about your visit.',personal:'We appreciate you taking the time to share your experience.',short:'Thank you for your feedback.'};
describe.skipIf(!url)('Dubai Shawarma rating rules in isolated storage, no external AI or Google calls',()=>{
 it('persists drafts for all low ratings; positive ratings publish only with explicit eligible autopilot',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Only isolated staging is allowed');
  const sql=neon(url!),email=`dubai-autopilot-${randomUUID()}@example.test`;
  const [customer]=await sql`INSERT INTO customers(email,account_status) VALUES(${email},'active') RETURNING id`;
  vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');
  try{
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit) VALUES(${customer.id},'testing','testing',1,30)`;
   const [b]=await sql`INSERT INTO businesses(customer_id,business_name) VALUES(${customer.id},'Dubai Shawarma & Cafe — isolated test') RETURNING id`;
   const businessId=String(b.id),parent=`accounts/test/locations/${businessId}`;
   await sql`SELECT claim_marketing_location(${businessId}::uuid,${customer.id}::uuid)`;
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${email},${email},${email},'fixture','fixture',now(),'fixture')`;
   await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,ai_consent) VALUES(${businessId},${customer.id},${email},${email},${parent},'Dubai Shawarma & Cafe — isolated test',true)`;
   await sql`UPDATE google_review_links SET draft_low_stars=true,review_knowledge_approved_at=now() WHERE business_id=${businessId}`;
   const cases=[...['ONE','TWO','THREE','FOUR','FIVE'].flatMap(starRating=>[false,true].map(on=>({starRating,on,four:true,five:true,historical:false,spam:false}))),
    {starRating:'FOUR',on:true,four:false,five:true,historical:false,spam:false},
    {starRating:'FIVE',on:true,four:true,five:false,historical:false,spam:false},
    {starRating:'FIVE',on:true,four:true,five:true,historical:true,spam:false},
    {starRating:'FIVE',on:true,four:true,five:true,historical:false,spam:true}];
   for(const c of cases){
    await sql`UPDATE google_review_links SET auto_enabled=${c.on},auto_four=${c.four},auto_five=${c.five},consent_at=now()-interval '1 hour',ai_last_at=NULL,settings_version=settings_version+1 WHERE business_id=${businessId}`;
    const reviewId=randomUUID(),resource=parent+'/reviews/'+reviewId;
    const data={reviewId,name:resource,starRating:c.starRating,comment:'Synthetic test feedback about the food and service.',createTime:new Date(Date.now()-(c.historical?7200000:1000)).toISOString(),updateTime:new Date().toISOString()};
    const [r]=await sql`INSERT INTO google_live_reviews(business_id,resource,data,suspected_spam) VALUES(${businessId},${resource},${JSON.stringify(data)}::jsonb,${c.spam}) RETURNING id`;
    if(c.historical)await olderReviews({kind:'customer',email},businessId,true,sql);
    const generator=vi.fn().mockResolvedValue(styles);
    const google={getReview:vi.fn().mockResolvedValue(data),publishReply:vi.fn().mockResolvedValue({comment:styles.friendly})};
    const result=await prepareAutomaticDraft(businessId,sql,generator,(id,version)=>publishLiveReply({kind:'admin'},id,version,true,sql,async()=>google as any));
    const shouldPublish=c.on&&!c.spam&&((c.starRating==='FOUR'&&c.four)||(c.starRating==='FIVE'&&c.five));
    const [scheduled]=await sql`SELECT scheduled_at,version FROM google_live_reviews WHERE id=${r.id}`;
    expect(Boolean(scheduled.scheduled_at)).toBe(shouldPublish);
    expect(google.publishReply).not.toHaveBeenCalled();
    if(shouldPublish){
     await expect(publishLiveReply({kind:'admin'},String(r.id),Number(scheduled.version),true,sql,async()=>google as any)).rejects.toThrow('no longer eligible');
     await sql`UPDATE google_live_reviews SET scheduled_at=now()-interval '1 minute' WHERE id=${r.id}`;
     await publishLiveReply({kind:'admin'},String(r.id),Number(scheduled.version),true,sql,async()=>google as any);
    }
    const [saved]=await sql`SELECT draft,approved_version,publish_state,attempted_at FROM google_live_reviews WHERE id=${r.id}`;
    expect(result.drafted,JSON.stringify(c)).toBe(!c.spam);
    expect(saved.draft).toBe(c.spam?'':styles.friendly);
    expect(saved.approved_version).toBeNull();
    expect(saved.publish_state).toBe(shouldPublish?'published':'idle');
    expect(Boolean(saved.attempted_at)).toBe(shouldPublish);
    expect(google.publishReply).toHaveBeenCalledTimes(shouldPublish?1:0);
    if(shouldPublish)expect(google.publishReply).toHaveBeenCalledWith(resource,styles.friendly);
    if(c.spam)expect(generator).not.toHaveBeenCalled();
    else expect(generator).toHaveBeenCalledWith('Dubai Shawarma & Cafe — isolated test',expect.any(Number),data.comment,undefined,{businessId,customerId:String(customer.id),service:'review_automatic'});
   }
   // Low-star opt-out must prevent generation, including the older-review action.
   const lowId=randomUUID(),lowData={reviewId:lowId,starRating:'ONE',comment:'Synthetic low-star feedback',createTime:new Date().toISOString(),updateTime:new Date().toISOString()};
   await sql`INSERT INTO google_live_reviews(business_id,resource,data) VALUES(${businessId},${parent+'/reviews/'+lowId},${JSON.stringify(lowData)}::jsonb)`;
   await sql`UPDATE google_review_links SET draft_low_stars=false,ai_last_at=NULL WHERE business_id=${businessId}`;
   const lowGenerator=vi.fn().mockResolvedValue(styles);
   expect((await prepareAutomaticDraft(businessId,sql,lowGenerator)).drafted).toBe(false);expect(lowGenerator).not.toHaveBeenCalled();
   expect((await olderReviews({kind:'customer',email},businessId,false,sql)).total).toBe(0);
   await sql`UPDATE google_review_links SET draft_low_stars=true WHERE business_id=${businessId}`;
   expect((await prepareAutomaticDraft(businessId,sql,lowGenerator)).drafted).toBe(true);
   const [lowSaved]=await sql`SELECT scheduled_at,publish_state FROM google_live_reviews WHERE resource=${parent+'/reviews/'+lowId}`;
   expect(lowSaved.scheduled_at).toBeNull();expect(lowSaved.publish_state).toBe('idle');
   const cached=await sql`SELECT data FROM google_live_reviews WHERE business_id=${businessId}`;
   const imported=await syncLiveReviews({kind:'customer',email},businessId,sql,async()=>({listReviews:async()=>({reviews:cached.map(r=>r.data),totalReviewCount:cached.length})} as any));
   expect(imported.imported).toBe(cases.length+1);
   await sql`UPDATE google_review_links SET auto_enabled=true,auto_four=true,auto_five=true,consent_at=now() WHERE business_id=${businessId}`;
   const backlog=[];
   for(let i=0;i<21;i++){
    const data={reviewId:randomUUID(),starRating:i%2?'FOUR':'FIVE',comment:'Isolated backlog fixture',createTime:'2025-01-01T00:00:00Z',updateTime:'2025-01-01T00:00:00Z'};
    const [r]=await sql`INSERT INTO google_live_reviews(business_id,resource,data) VALUES(${businessId},${parent+'/reviews/'+data.reviewId},${JSON.stringify(data)}::jsonb) RETURNING id`;
    backlog.push({id:r.id,data});
   }
   await queueHistoricalPositives(businessId,sql);
   const [queued]=await sql`SELECT old_reply_requested_at FROM google_live_reviews WHERE id=${backlog[0].id}`;expect(queued.old_reply_requested_at).toBeTruthy();
   await sql`UPDATE google_live_reviews SET draft='Synthetic approved-style reply',draft_generated_at=now() WHERE id=ANY(${backlog.map(r=>r.id)}::uuid[])`;
   await scheduleSavedReply(backlog[0].id,1,sql);
   const [wait]=await sql`SELECT extract(epoch FROM scheduled_at-old_reply_requested_at)::int AS seconds FROM google_live_reviews WHERE id=${backlog[0].id}`;expect(wait.seconds).toBe(3600);
   await sql`UPDATE google_live_reviews r SET scheduled_at=now()-interval '1 second',scheduled_version=r.version,schedule_consent_at=l.consent_at FROM google_review_links l WHERE l.business_id=r.business_id AND r.id=ANY(${backlog.map(r=>r.id)}::uuid[])`;
   // Reset earlier fixture attempts to isolate the rolling hourly publishing ceiling.
   await sql`UPDATE google_live_reviews SET attempted_at=now()-interval '2 hours' WHERE business_id=${businessId} AND id<>ALL(${backlog.map(r=>r.id)}::uuid[])`;
   const publisher=vi.fn(async()=>({comment:'Synthetic approved-style reply',updateTime:new Date().toISOString()}));
   for(let i=0;i<backlog.length;i++){
    const r=backlog[i];const result=await publishLiveReply({kind:'customer',email},r.id,1,true,sql,async()=>({getReview:async()=>r.data,publishReply:publisher} as any));
    expect(result.published).toBe(i<20);
   }
   expect(publisher).toHaveBeenCalledTimes(20);
   const [deferred]=await sql`SELECT scheduled_at>now() AS deferred,publish_state FROM google_live_reviews WHERE id=${backlog[20].id}`;expect(deferred).toEqual({deferred:true,publish_state:'idle'});
  }finally{
   vi.unstubAllEnvs();
   await sql`DELETE FROM businesses WHERE customer_id=${customer.id}`;
   await sql`DELETE FROM google_business_connections WHERE owner=${email}`;
   await sql`DELETE FROM customers WHERE id=${customer.id}`;
  }
 },120000);
});
