import {beforeEach,describe,expect,it,vi} from 'vitest';
import {addReviewPreviewPage,emptyReviewAnalysis,reviewPreviewSummary} from '@/lib/reviews-preview-analysis';
import type {GoogleReview} from '@/lib/google-business/client';
const m=vi.hoisted(()=>({sql:vi.fn(),jar:new Map<string,string>(),client:vi.fn(),connection:vi.fn()}));
vi.mock('next/headers',()=>({cookies:async()=>({get:(key:string)=>m.jar.has(key)?{value:m.jar.get(key)}:undefined,set:(key:string,value:string)=>m.jar.set(key,value)})}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>m.sql,clientFor:m.client}));
vi.mock('@/lib/google-business/connection',()=>({googleConnectionSummary:m.connection}));
import {currentReviewPreview,previewCookie,isReviewPreviewCallback,previewFlowCookie,selectReviewPreview,reserveReviewPreview,reviewPreviewSnapshot} from '@/lib/reviews-purchase-preview';
const id='adf1a7fb-c536-4a76-8ab2-5d92f24089db',cookie=id+'.'+'a'.repeat(43),parent='accounts/123/locations/456';
const review=(reviewId:string,starRating:GoogleReview['starRating'],comment?:string)=>({reviewId,starRating,...(comment===undefined?{}:{reviewReply:{comment}})});
beforeEach(()=>{vi.resetAllMocks();m.jar.clear();m.connection.mockResolvedValue({email:'google@example.test'});});
describe('unanswered review analysis',()=>{
 it('counts every star, rating-only reviews, empty replies, duplicates and unknown ratings accurately',()=>{
  const page1=addReviewPreviewPage(emptyReviewAnalysis(),{reviews:[review('a','ONE'),review('b','TWO','  '),review('c','THREE','Thank you'),review('d','FOUR'),review('e','FIVE')],nextPageToken:'next',totalReviewCount:6},parent);
  const page2=addReviewPreviewPage(page1,{reviews:[review('e','FIVE'),review('f','STAR_RATING_UNSPECIFIED')]},parent);
  expect(reviewPreviewSummary(page2)).toMatchObject({reviewCount:6,unanswered:5,unknownStars:1,byStars:[{stars:1,unanswered:1},{stars:2,unanswered:1},{stars:3,unanswered:0},{stars:4,unanswered:1},{stars:5,unanswered:1}]});
  expect(JSON.stringify(page2)).not.toContain('Thank you');expect(Object.keys(page1.reviews)).toHaveLength(5);
 });
 it('does not invent an estimate when Google returns no reviews',()=>{expect(reviewPreviewSummary(emptyReviewAnalysis())).toMatchObject({total:null,reviewCount:0,unanswered:0});});
 it('rejects another location and repeated pagination tokens',()=>{
  expect(()=>addReviewPreviewPage(emptyReviewAnalysis(),{reviews:[{...review('a','FIVE'),name:'accounts/other/locations/other/reviews/a'}]},parent)).toThrow('different location');
  const a=addReviewPreviewPage(emptyReviewAnalysis(),{reviews:[],nextPageToken:'again'},parent);
  expect(()=>addReviewPreviewPage(a,{reviews:[],nextPageToken:'again'},parent)).toThrow('restart');
 });
});
describe('isolated preview ownership',()=>{
 it('never accesses storage without a valid browser capability',async()=>{expect(await currentReviewPreview()).toBeNull();m.jar.set(previewCookie,'injected');expect(await currentReviewPreview()).toBeNull();expect(m.sql).not.toHaveBeenCalled();});
 it('binds a lookup to a hash of the secret and expiration',async()=>{m.jar.set(previewCookie,cookie);m.sql.mockResolvedValue([]);expect(await currentReviewPreview()).toBeNull();const call=m.sql.mock.calls[0];expect(call[0].join('')).toContain('expires_at>now()');expect(call).toContain(id);expect(call).not.toContain('a'.repeat(43));});
 it('dispatches only the state belonging to this browser preview',async()=>{m.jar.set(previewFlowCookie,'expected');expect(await isReviewPreviewCallback('other')).toBe(false);expect(await isReviewPreviewCallback(null)).toBe(false);expect(await isReviewPreviewCallback('expected')).toBe(true);});
 it('refuses a Google business that does not match the searched place',async()=>{m.jar.set(previewCookie,cookie);m.sql.mockResolvedValue([{id,selection:{placeId:'right'}}]);const reviews=vi.fn();m.client.mockResolvedValue({getMapAnchor:async()=>({placeId:'wrong'}),listReviews:reviews});await expect(selectReviewPreview('accounts/123','locations/456')).rejects.toThrow('different business');expect(reviews).not.toHaveBeenCalled();expect(m.sql).toHaveBeenCalledTimes(1);});
 it('allows a snapshot of an assigned location but blocks buying it',async()=>{m.jar.set(previewCookie,cookie);const row={id,complete:true,google_location:'locations/456',analysis:emptyReviewAnalysis(),selection:{name:'Existing business'},verified_name:'Existing business'};m.sql.mockImplementation(async(strings:TemplateStringsArray)=>strings.join('').includes('SELECT * FROM reviews_purchase')?[row]:[{business_id:'existing'}]);expect((await reviewPreviewSnapshot()).preview).toMatchObject({alreadyAssigned:true,complete:true});await expect(reserveReviewPreview('new@example.test',id,'test')).rejects.toThrow('already has');expect(m.sql.mock.calls.every(c=>!c[0].join('').includes('UPDATE'))).toBe(true);});
 it('blocks checkout while analysis is incomplete',async()=>{m.jar.set(previewCookie,cookie);m.sql.mockResolvedValue([{id,complete:false}]);await expect(reserveReviewPreview('x@example.test',id,'test')).rejects.toThrow('finish your review analysis');});
});
