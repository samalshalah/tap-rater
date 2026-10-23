import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {prepareAutomaticDraft,publishLiveReply} from '@/lib/google-business/live-reviews';
import {generateReviewSuggestions} from '@/lib/review-ai-provider';
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
    const ai=vi.fn().mockResolvedValue({response:JSON.stringify(styles)});
    const generator=vi.fn((name:string,rating:number,comment:string)=>generateReviewSuggestions(name,rating,comment,ai));
    const google={getReview:vi.fn().mockResolvedValue(data),publishReply:vi.fn().mockResolvedValue({comment:styles.friendly})};
    const result=await prepareAutomaticDraft(businessId,sql,generator,(id,version)=>publishLiveReply({kind:'admin'},id,version,true,sql,async()=>google as any));
    const shouldPublish=c.on&&!c.historical&&!c.spam&&((c.starRating==='FOUR'&&c.four)||(c.starRating==='FIVE'&&c.five));
    const [saved]=await sql`SELECT draft,approved_version,publish_state,attempted_at FROM google_live_reviews WHERE id=${r.id}`;
    expect(result.drafted,JSON.stringify(c)).toBe(!c.spam);
    expect(saved.draft).toBe(c.spam?'':styles.friendly);
    expect(saved.approved_version).toBeNull();
    expect(saved.publish_state).toBe(shouldPublish?'published':'idle');
    expect(Boolean(saved.attempted_at)).toBe(shouldPublish);
    expect(google.publishReply).toHaveBeenCalledTimes(shouldPublish?1:0);
    if(shouldPublish)expect(google.publishReply).toHaveBeenCalledWith(resource,styles.friendly);
    if(c.spam)expect(ai).not.toHaveBeenCalled();
    else expect(generator).toHaveBeenCalledWith('Dubai Shawarma & Cafe — isolated test',expect.any(Number),data.comment,undefined,{businessId,customerId:String(customer.id),service:'review_automatic'});
   }
  }finally{
   vi.unstubAllEnvs();
   await sql`DELETE FROM businesses WHERE customer_id=${customer.id}`;
   await sql`DELETE FROM google_business_connections WHERE owner=${email}`;
   await sql`DELETE FROM customers WHERE id=${customer.id}`;
  }
 },120000);
});
