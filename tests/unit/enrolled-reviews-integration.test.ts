import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {mutateLocal} from '@/lib/local-management';
import {bindGoogleLocation,syncLiveReviews,prepareAutomaticDraft,publishLiveReply} from '@/lib/google-business/live-reviews';
import {queueHistoricalPositives} from '@/lib/google-business/live-review-core';
import {saveReviewKnowledge} from '@/lib/review-knowledge';

const url=process.env.REVIEW_SANDBOX;
describe.skipIf(!url)('enrolled review automation on isolated database',()=>{
 it('drafts all ratings, publishes only 4–5, and restores those defaults after reconnecting',async()=>{
  expect(new URL(url!).hostname).toBe('ep-morning-meadow-at5tmqst-pooler.c-9.us-east-1.aws.neon.tech');
  const sql=neon(url!),uid=randomUUID(),email=uid+'@example.test';
  const actor={kind:'customer' as const,email};
  const [customer]=await sql`INSERT INTO customers(email,account_status) VALUES(${email},'active') RETURNING id`;
  await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit) VALUES(${customer.id},'testing','testing',1,100)`;
  const add=async()=>String((await mutateLocal(actor,{action:'createLocation',name:'Test Cafe',address:'',phone:'',website:''},sql)).id);
  const original=await add(),parent='accounts/test/locations/'+uid;
  const reviews=['ONE','TWO','THREE','FOUR','FIVE'].flatMap((starRating,i)=>['old','new'].map(age=>({
    reviewId:age+i,starRating,comment:'Synthetic review',
    createTime:new Date(Date.now()+(age==='old'?-86400000:3600000)).toISOString()
  })));
  const publish=vi.fn(async(_resource:string,comment:string)=>({comment}));
  const google:any=async()=>({
    listLocations:async()=>({locations:[{name:'locations/'+uid,title:'Test Cafe'}]}),
    listReviews:async()=>({reviews,totalReviewCount:10}),
    getReview:async(resource:string)=>reviews.find(r=>resource.endsWith('/'+r.reviewId)),
    publishReply:publish
  });
  async function bind(id:string){
    const owner='customer:'+email+':location:'+id;
    await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${uid},${email},'fake','fake',now(),'fake')`;
    await bindGoogleLocation(owner,id,'accounts/test','locations/'+uid,sql,google,email);
  }
  await bind(original);
  const [settings]=await sql`SELECT * FROM google_review_links WHERE business_id=${original}`;
  expect(settings).toMatchObject({ai_consent:true,auto_enabled:true,auto_four:true,auto_five:true,draft_low_stars:true,review_knowledge_approved_at:null});
  await syncLiveReviews(actor,original,sql,google);
  await queueHistoricalPositives(original,sql);
  expect((await sql`SELECT count(*)::int AS n FROM google_live_reviews WHERE business_id=${original} AND old_reply_requested_at IS NOT NULL`)[0].n).toBe(5);
  const generate=vi.fn(async()=>({friendly:'Thank you for your feedback.',short:'Thank you.',professional:'Thank you.',personal:'Thank you.'}));
  for(let i=0;i<10;i++){
    // Simulate separate worker ticks without waiting for the production cooldown.
    await sql`UPDATE google_review_links SET ai_last_at=now()-interval '1 minute' WHERE business_id=${original}`;
    expect(await prepareAutomaticDraft(original,sql,generate)).toEqual({drafted:true});
  }
  expect(await prepareAutomaticDraft(original,sql,generate)).toEqual({drafted:false});
  const drafted=await sql`SELECT * FROM google_live_reviews WHERE business_id=${original}`;
  expect(drafted.filter(r=>r.scheduled_at)).toHaveLength(4);
  expect(drafted.every(r=>r.draft&&r.attempted_at===null)).toBe(true);
  const previousFlag=process.env.GOOGLE_REVIEWS_PUBLISHING_ENABLED;
  process.env.GOOGLE_REVIEWS_PUBLISHING_ENABLED='true';
  try{
    for(const row of drafted){
      if(['ONE','TWO','THREE'].includes(row.data.starRating)){
        await expect(publishLiveReply(actor,row.id,row.version,true,sql,google)).rejects.toThrow('no longer eligible');
      }else{
        await sql`UPDATE google_live_reviews SET scheduled_at=now()-interval '1 minute' WHERE id=${row.id}`;
        expect(await publishLiveReply(actor,row.id,row.version,true,sql,google)).toEqual({published:true});
      }
    }
  }finally{
    if(previousFlag===undefined)delete process.env.GOOGLE_REVIEWS_PUBLISHING_ENABLED;
    else process.env.GOOGLE_REVIEWS_PUBLISHING_ENABLED=previousFlag;
  }
  expect(publish).toHaveBeenCalledTimes(4);
  await saveReviewKnowledge(actor,{businessId:original,version:settings.settings_version,knowledge:{},approveLowStars:false},sql);
  expect((await sql`SELECT draft_low_stars FROM google_review_links WHERE business_id=${original}`)[0].draft_low_stars).toBe(true);
  await sql`INSERT INTO google_live_reviews(business_id,resource,data)
    SELECT ${original},${parent}||'/reviews/pending-'||rating,
      jsonb_build_object('starRating',rating,'createTime',now()-interval '1 day')
    FROM unnest(ARRAY['ONE','FIVE']) AS rating`;
  const [business]=await sql`SELECT local_profile_version FROM businesses WHERE id=${original}`;
  await mutateLocal(actor,{action:'deleteLocation',businessId:original,version:business.local_profile_version},sql);
  const replacement=await add();await bind(replacement);
  expect((await sql`SELECT ai_consent,auto_enabled,auto_four,auto_five,draft_low_stars FROM google_review_links WHERE business_id=${replacement}`)[0])
    .toEqual({ai_consent:true,auto_enabled:true,auto_four:true,auto_five:true,draft_low_stars:true});
  expect((await sql`SELECT count(*)::int AS n FROM google_live_reviews WHERE business_id=${replacement}`)[0].n).toBe(12);
  await queueHistoricalPositives(replacement,sql);
  expect((await sql`SELECT count(*)::int AS n FROM google_live_reviews
    WHERE business_id=${replacement} AND draft='' AND old_reply_requested_at IS NOT NULL
      AND NOT auto_schedule_cancelled`)[0].n).toBe(2);
 },60000);
});
