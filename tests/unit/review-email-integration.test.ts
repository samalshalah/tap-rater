import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi} from 'vitest';
import {emailLocations,saveEmailPrefs,type ReviewEmailSettings} from '@/lib/review-email-preferences';
import {deliverReviewEmails,enqueueReviewReports} from '@/lib/review-email-delivery';
const url=process.env.REVIEW_NOTIFICATION_TEST_DB;
describe.skipIf(!url)('location review email workflow',()=>{
 it('honors opt-ins, calendar periods, retries, ownership, historical imports and removal',async()=>{
  expect(new URL(url!).hostname).toContain('ep-morning-meadow-at5tmqst');
  const sql=neon(url!),customer=randomUUID(),business=randomUUID(),email=customer+'@example.test';
  const send=vi.fn().mockResolvedValue({sent:true});
  await sql`INSERT INTO customers(id,email,account_status) VALUES(${customer},${email},'active')`;
  try{
   await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit) VALUES(${customer},'testing','testing',1)`;
   await sql`INSERT INTO businesses(id,customer_id,business_name) VALUES(${business},${customer},'Test Cafe')`;
   await sql`INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title) VALUES(${business},${customer},'fixture','fixture',${'accounts/test/locations/'+business},'Test Cafe')`;
   const v:ReviewEmailSettings={businessId:business,version:0,lowMode:'immediate',highMode:'daily',weekly:true,monthly:true,hour:9,zone:'America/New_York'};
   const add=async(rating:string,days=0)=>sql`INSERT INTO google_live_reviews(business_id,resource,data)
     VALUES(${business},${randomUUID()},jsonb_build_object('starRating',${rating}::text,'createTime',now()-${days}::int*interval '1 day'))`;
   await add('ONE');expect((await emailLocations(email,sql))[0].version).toBeNull();
   expect(await saveEmailPrefs('other@example.test',v,sql)).toBeUndefined();
   expect(await saveEmailPrefs(email,v,sql)).toBe(1);
   expect(await saveEmailPrefs(email,v,sql)).toBeUndefined();
   await add('THREE',500);await add('TWO');await add('FOUR');await add('FIVE');
   const jobs=await sql`SELECT * FROM review_email_queue WHERE business_id=${business} ORDER BY kind`;
   expect(jobs.map(j=>j.kind)).toEqual(['daily','review']);expect(jobs[0].high_count).toBe(2);
   send.mockResolvedValueOnce({sent:false});
   expect((await deliverReviewEmails(sql,send)).failed).toBe(1);
   await sql`UPDATE review_email_queue SET retry_at=now() WHERE business_id=${business} AND kind='review'`;
   await Promise.all([deliverReviewEmails(sql,send),deliverReviewEmails(sql,send)]);
   expect(send).toHaveBeenCalledTimes(2);expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
   expect(send.mock.calls[1][0].to).toBe(email);
   // Use fixed local calendar boundaries, including the November daylight-saving transition.
   await sql`UPDATE review_email_preferences SET changed_at='2026-10-01' WHERE business_id=${business}`;
   await enqueueReviewReports(sql,new Date('2026-11-02T14:05:00Z'));await enqueueReviewReports(sql,new Date('2026-11-02T14:10:00Z'));
   const reports=await sql`SELECT kind,period_start,period_end FROM review_email_queue WHERE business_id=${business} AND kind IN ('month','week') ORDER BY kind`;
   expect(reports).toHaveLength(2);expect(new Date(reports[1].period_start).toISOString()).toBe('2026-10-26T04:00:00.000Z');
   expect(new Date(reports[1].period_end).toISOString()).toBe('2026-11-02T05:00:00.000Z');
   await sql`UPDATE review_email_queue SET due_at=now() WHERE business_id=${business} AND finished_at IS NULL`;
   expect((await deliverReviewEmails(sql,send)).submitted).toBe(3);
   expect(send.mock.calls.map(c=>c[0].subject)).toEqual(expect.arrayContaining(['Weekly review report · Test Cafe','Monthly review report · Test Cafe','Your daily review digest · Test Cafe']));
   await add('TWO');
   expect(await saveEmailPrefs(email,{...v,version:1,lowMode:'off',highMode:'off',weekly:false,monthly:false},sql)).toBe(2);
   expect((await deliverReviewEmails(sql,send)).submitted).toBe(0);
   await saveEmailPrefs(email,{...v,version:2},sql);await add('TWO');
   await sql`UPDATE google_review_links SET enabled=false WHERE business_id=${business}`;
   expect((await deliverReviewEmails(sql,send)).submitted).toBe(0);
  }finally{
   await sql`DELETE FROM businesses WHERE id=${business}`;
   await sql`DELETE FROM customers WHERE id=${customer}`;
  }
 },60000);
});
