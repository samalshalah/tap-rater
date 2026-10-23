import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {syncLiveReviews,prepareAutomaticDraft} from '@/lib/google-business/live-reviews';
import {generateReviewSuggestions} from '@/lib/review-ai-provider';
import {meterAiCall} from '@/lib/ai-usage-meter';

const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
const realAi=process.env.REVIEW_AUTOMATION_LIVE_AI==='1';
describe.skipIf(!url)('review import to AI draft across isolated locations',()=>{
 it('imports new reviews, drafts each in its own location and never publishes or duplicates drafts',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Only isolated staging is allowed');
  const sql=neon(url!),uid=randomUUID(),owner='test-import:'+uid,businesses:string[]=[];
  const [customer]=await sql`INSERT INTO customers(email,account_status) VALUES (${uid+'@example.test'},'active') RETURNING id`;
  const publishReply=vi.fn();
  try{
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES (${owner},${uid},${uid+'@example.test'},'test-only','test-only',now(),'test-only')`;
   for(const name of ['Synthetic North Boutique','Synthetic South Boutique']){
    const [b]=await sql`INSERT INTO businesses(customer_id,business_name) VALUES (${customer.id},${name}) RETURNING id`;businesses.push(b.id);
    await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,ai_consent) VALUES (${b.id},${customer.id},${owner},${uid},${'accounts/test/locations/'+b.id},${name},true)`;
   }
   const generate=vi.fn(async(name:string,rating:number,comment:string,_run:unknown,context:any)=>{
    if(!realAi)return {friendly:`Thank you for your feedback about ${name}.`,professional:'Thank you for your feedback.',personal:'We appreciate your feedback.',short:'Thank you.'};
    return generateReviewSuggestions(name,rating,comment,(model,input)=>meterAiCall(context,model,input,async(m,i)=>{
     const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.REVIEW_TEST_CF_ACCOUNT}/ai/run/${m}`,{method:'POST',headers:{Authorization:`Bearer ${process.env.REVIEW_TEST_CF_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(i),signal:AbortSignal.timeout(60000)});
     if(!response.ok)throw Error(`AI test provider returned ${response.status}`);
     const body=await response.json();if(!body.success)throw Error('AI test provider failed');return body.result;
    },sql));
   });
   for(const [index,id] of businesses.entries()){
    const parent='accounts/test/locations/'+id;
    const review={reviewId:'synthetic-new',name:parent+'/reviews/synthetic-new',starRating:index?'ONE':'FIVE',comment:index?'Synthetic test: I waited too long for assistance.':'Synthetic test: helpful staff and a lovely scarf.',createTime:new Date().toISOString(),updateTime:new Date().toISOString()};
    const client={listReviews:vi.fn().mockResolvedValue({reviews:[review]}),publishReply};
    expect(await syncLiveReviews({kind:'admin'},id,sql,async()=>client as any)).toEqual({imported:1,more:false});
    expect(await prepareAutomaticDraft(id,sql,generate)).toEqual({drafted:true});
    const [saved]=await sql`SELECT draft,approved_version,publish_state,attempted_at,resource FROM google_live_reviews WHERE business_id=${id}`;
    expect(saved.draft.length).toBeGreaterThan(5);expect(saved.approved_version).toBeNull();expect(saved.publish_state).toBe('idle');expect(saved.attempted_at).toBeNull();expect(saved.resource).toBe(review.name);
    expect(await prepareAutomaticDraft(id,sql,generate)).toEqual({drafted:false});
   }
   expect(generate).toHaveBeenCalledTimes(2);expect(publishReply).not.toHaveBeenCalled();
   expect(generate.mock.calls.map(c=>c[4].businessId)).toEqual(businesses);
   if(realAi){const events=await sql`SELECT business_id,status FROM ai_usage_events WHERE customer_id=${customer.id}`;expect(events).toHaveLength(2);expect(events.every(e=>['measured','usage_missing'].includes(e.status))).toBe(true);}
  }finally{
   await sql`DELETE FROM ai_usage_events WHERE customer_id=${customer.id}`;
   for(const id of businesses)await sql`DELETE FROM businesses WHERE id=${id}`;
   await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;
   await sql`DELETE FROM customers WHERE id=${customer.id}`;
  }
 },180000);
});
