import {describe,it,expect,vi} from 'vitest';
import type Stripe from 'stripe';
import {planChoiceSchema,planProposal,supportedReviewPlan} from '@/lib/reviews-plan-management';
const account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const location='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const sub=()=>({id:'sub_qa',status:'active',collection_method:'charge_automatically',metadata:{tap_rater:'marketing_growth_v1',account_id:account},items:{data:[{quantity:2,current_period_start:1000,current_period_end:2000,price:{unit_amount:2900,currency:'usd',recurring:{interval:'month',interval_count:1}}}]}} as unknown as Stripe.Subscription);
const choice=(overrides:object={})=>planChoiceSchema.parse({kind:'locations',removedIds:[location],...overrides});
describe('Reviews renewal proposals',()=>{
 it('requires the exact account and standard standalone Reviews price',()=>{
  expect(()=>supportedReviewPlan(sub(),'foreign')).toThrow();
  const s=sub();s.items.data[0].price.unit_amount=100;expect(()=>supportedReviewPlan(s,account)).toThrow();
 });
 it('rejects foreign, duplicate and excessive unused licences',()=>{
  expect(()=>planProposal(sub(),choice(),[],[],1000000)).toThrow('belonging');
  expect(()=>planProposal(sub(),choice({removedIds:[location,location]}),[{id:location}],[],1000000)).toThrow();
  expect(()=>planProposal(sub(),choice({removedIds:[],unusedToRemove:2}),[{id:location}],[],1000000)).toThrow('Unused');
 });
 it('requires whole cancellation for the final licence and blocks the renewal boundary',()=>{
  const s=sub();s.items.data[0].quantity=1;
  expect(()=>planProposal(s,choice(),[{id:location}],[],1000000)).toThrow('last paid location');
  expect(()=>planProposal(sub(),choice(),[{id:location}],[],1900000)).toThrow('Renewal');
 });
 it('binds confirmation to pending removals and unused licences',()=>{
  const p=planProposal(sub(),choice(),[{id:location}],[],1000000);
  expect(p.nextSubtotal).toBe(2900);
  expect(planProposal(sub(),choice(),[{id:location}],[location],1000000).token).not.toBe(p.token);
  expect(planProposal(sub(),choice(),[{id:location}],[],1000000,1).token).not.toBe(p.token);
 });
 it('requires keeping a cancelling subscription before editing locations',()=>{
  const s=sub();s.cancel_at_period_end=true;
  expect(()=>planProposal(s,choice(),[{id:location}],[],1000000)).toThrow('Keep');
 });
});
