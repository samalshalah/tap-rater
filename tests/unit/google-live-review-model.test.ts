import { describe, expect, it } from 'vitest';
import { appendUnseenReviews, countReviewFilters, matchesReview, mergeReviewSnapshot, reviewFilters, scopeReviewWorkspaces } from '@/components/account/google-live-review-model';
import type { Row, Snapshot, Workspace } from '@/components/account/google-live-review-types';
const row = (id: string, extra: Partial<Row> = {}): Row => ({id, data:{starRating:'FIVE'}, draft:'', version:1, publish_state:'idle', ...extra} as Row);
const workspace = (id: string, reviews: Row[], moreReviews = false): Workspace => ({business_id:id,reviews,moreReviews} as Workspace);
const snapshot = (...workspaces: Workspace[]): Snapshot => ({workspaces,publishingEnabled:false});
describe('review list indexing', () => {
 it('preserves ordering, fresh values, and duplicates within each page', () => {
  const existing=[row('a'),row('a')], incoming=[row('a',{draft:'stale'}),row('b'),row('b')];
  expect(appendUnseenReviews(existing,incoming)).toEqual([existing[0],existing[1],incoming[1],incoming[2]]);
  expect(existing).toHaveLength(2);expect(incoming).toHaveLength(3);
 });
 it('reads IDs linearly when merging a large history', () => {
  let reads=0; const make=(id:string)=>({...row(id),get id(){reads++;return id;}});
  const old=Array.from({length:10000},(_,i)=>make(String(i)));
  const fresh=Array.from({length:100},(_,i)=>make(String(i)));
  expect(appendUnseenReviews(fresh,old)).toHaveLength(10000);
  expect(reads).toBe(10100);
 });
 it('does not preserve history during an explicit refresh or initial load', () => {
  const fresh=snapshot(workspace('a',[row('new')]));
  expect(mergeReviewSnapshot(fresh,null,true)).toBe(fresh);
  expect(mergeReviewSnapshot(fresh,snapshot(workspace('a',[row('old')])),false)).toBe(fresh);
 });
 it.each([0,100,101])('preserves loaded history only beyond 100 rows (%i)', count => {
  const old=workspace('a',Array.from({length:count},(_,i)=>row(String(i))),false);
  const fresh=workspace('a',[row('0',{draft:'updated'})],true);
  const result=mergeReviewSnapshot(snapshot(fresh),snapshot(old),true).workspaces[0];
  expect(result.reviews[0].draft).toBe('updated');
  expect(result.reviews).toHaveLength(count>100?count:1);
  expect(result.moreReviews).toBe(count>100?false:true);
 });
 it('uses the first matching workspace and never reintroduces removed locations', () => {
  const old=workspace('a',Array.from({length:101},(_,i)=>row(String(i))),false);
  const result=mergeReviewSnapshot(snapshot(workspace('new',[]),workspace('a',[])),snapshot(old,workspace('a',[row('wrong')]),workspace('removed',[])),true);
  expect(result.workspaces.map(w=>w.business_id)).toEqual(['new','a']);
  expect(result.workspaces[1].reviews).toEqual(old.reviews);
 });
 it('enforces location scope including an empty allowlist and conflicting selections', () => {
  const all=[workspace('a',[]),workspace('b',[])];
  expect(scopeReviewWorkspaces(all)).toEqual(all);
  expect(scopeReviewWorkspaces(all,undefined,[])).toEqual([]);
  expect(scopeReviewWorkspaces(all,'a',['b'])).toEqual([]);
  expect(scopeReviewWorkspaces(all,'a',['a','a'])).toEqual([all[0]]);
  expect(scopeReviewWorkspaces(all,undefined,['b'])).toEqual([all[1]]);
 });
 it('retains overlapping status counts while isolating suspected spam', () => {
  const reviews=[row('empty'),row('draft',{draft:'Hi'}),row('approved',{draft:'Hi',approved_version:1}),row('replied',{data:{starRating:'FIVE',reviewReply:{comment:'Thanks'}} as Row['data']}),row('spam',{suspected_spam:true,draft:'Hi'})];
  expect(countReviewFilters([workspace('a',reviews)])).toEqual({all:5,unanswered:3,drafts:1,approved:1,replied:1,spam:1});
 });
 it('matches the previous filter-count algorithm across all status combinations', () => {
  const reviews:Row[]=[];
  for(const spam of [false,true]) for(const draft of ['','Reply']) for(const reply of ['', 'Published']) for(const approved of [null,1,2]) for(const state of ['idle','published','publishing','uncertain']) reviews.push(row(String(reviews.length),{suspected_spam:spam,draft,approved_version:approved,publish_state:state,data:{starRating:'ONE',reviewReply:{comment:reply}} as Row['data']}));
  const all=[workspace('a',reviews),workspace('b',reviews.slice(0,10))];
  const counts=countReviewFilters(all);
  for(const [key] of reviewFilters) expect(counts[key]).toBe(all.flatMap(w=>w.reviews).filter(r=>matchesReview(r,key)).length);
 });
});
