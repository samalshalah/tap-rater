import {describe,expect,it} from 'vitest';
import {replyQualityIssues,reviewerFirstName,generateAutomaticReviewReply} from '@/lib/review-ai-provider';

describe('reviewer first name',()=>{
 it('uses a plausible first name only',()=>{
  expect(reviewerFirstName({displayName:'Omar Najjar'})).toBe('Omar');
  expect(reviewerFirstName({displayName:'haron'})).toBe('Haron');
  expect(reviewerFirstName({displayName:'A Google User'})).toBeUndefined();
  expect(reviewerFirstName({displayName:'Black Friday Daily Deals Online'})).toBeUndefined();
  expect(reviewerFirstName({displayName:'R2D2'})).toBeUndefined();
  expect(reviewerFirstName({displayName:'Sam',isAnonymous:true})).toBeUndefined();
  expect(reviewerFirstName(undefined)).toBeUndefined();
 });
});

describe('reply variety checks',()=>{
 const good='Thanks, Omar! A fresh cut before the weekend is the best kind of visit. We hope to see you in the chair again soon.';
 const replies=(friendly:string)=>({friendly,professional:'It is great to read that the appointment went smoothly from start to finish. You are always welcome back for your next cut.',personal:'Hearing that you left happy with your haircut made our day here at the shop. See you next time you are in the area.',short:'Glad the cut hit the mark. See you soon!'});
 it('rewrites stock openings and team claims',()=>{
  expect(replyQualityIssues(replies('We appreciate your kind words and are glad you had a great experience. See you soon at the shop.'),[]).join()).toContain('stock opening');
  expect(replyQualityIssues(replies('Great to hear it! Our team strives to provide excellent service to every guest who visits us.'),[]).join()).toContain('stock opening');
 });
 it('rewrites a reply that starts like a recent one',()=>{
  expect(replyQualityIssues(replies(good),['Thanks, Omar! A fresh look always helps and we hope to see you again.']).join()).toContain('starts the same way');
  expect(replyQualityIssues(replies(good),[])).toEqual([]);
 });
 it('allows staff names from the review but still blocks echoed descriptions',()=>{
  const review='Ask for haidar and ibrahim they has the best haircuts in the world';
  const named={...replies('Thank you for recommending Haidar and Ibrahim to others. A great cut is always worth the trip, and we hope to see you again soon.')};
  expect(replyQualityIssues(named,[],true,review).join()).not.toContain('friendly: echoes');
  const echoed={...replies('You said we have the best haircuts in the world, and we are proud of that. Hope to see you again before long.')};
  expect(replyQualityIssues(echoed,[],true,review).join()).toContain('friendly: echoes');
 });
});

it('gives the automatic writer the reviewer first name and the variety rules',async()=>{
 let input:{messages:{content:string}[]}|undefined;
 await generateAutomaticReviewReply('University Barber Shop',5,'Haidar gave me a great fade','friendly',async(_m,i)=>{input=i as never;return {response:JSON.stringify({reply:'Thanks, Omar! Your fade with Haidar sounds like a great start to the week. We hope to see you back in the chair soon.'})};},undefined,'Omar');
 expect(input!.messages[0].content).toContain('reviewerFirstName');
 expect(input!.messages[0].content).toContain('Do not open with');
 expect(JSON.parse(input!.messages[1].content).reviewerFirstName).toBe('Omar');
});
