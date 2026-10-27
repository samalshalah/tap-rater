import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {indexFirstMeasurements} from '@/lib/heatmap-results';
import {compareCompetitors} from '@/lib/heatmap-competitors';
import {StripePaymentForm} from '@/components/checkout/stripe-payment-panel';
const state=vi.hoisted(()=>({result:{} as any}));
vi.mock('@stripe/react-stripe-js/checkout',()=>({
 useCheckoutElements:()=>state.result,
 PaymentElement:()=> <div data-payment-element="true"/>,
 CheckoutElementsProvider:({children}:{children:React.ReactNode})=>children,
}));
vi.mock('@/lib/analytics-browser',()=>({trackCheckoutStep:vi.fn()}));
afterEach(()=>vi.clearAllMocks());
describe('indexed saved heatmap results',()=>{
 it('preserves first matches, gaps, unfinished states and not-found ranks',()=>{
  const points=[{index:2,state:'complete',rank:null},{index:0,state:'queued',rank:null},{index:2,state:'complete',rank:1}];
  const indexed=indexFirstMeasurements(points);
  for(let i=0;i<5;i++)expect(indexed.get(i)).toBe(points.find(p=>p.index===i));
  expect(indexFirstMeasurements([]).size).toBe(0);
 });
 it('keeps the latest duplicate capture and excludes other keywords and unfinished captures',()=>{
  const competitor=(placeId:string,rank:number)=>({placeId,title:placeId,rank,address:null,rating:null,reviews:null});
  const result=compareCompetitors([
   {trackId:'a',index:0,state:'complete',competitors:[competitor('old',1)]},
   {trackId:'a',index:0,state:'complete',competitors:[competitor('new',2)]},
   {trackId:'a',index:1,state:'complete',competitors:[]},
   {trackId:'a',index:2,state:'queued',competitors:[competitor('queued',1)]},
   {trackId:'b',index:3,state:'complete',competitors:[competitor('foreign',1)]},
  ],'a',{placeId:'target',title:'Target'},3);
  expect(result.captured).toBe(2);
  expect(result.rows.map(r=>r.placeId)).toEqual(['target','new']);
  expect(result.rows[1].ranks.slice(0,4)).toEqual([2,null,undefined,undefined]);
  expect(result.rows[1].shareOfVoice).toBe(100);
 });
});
describe('extracted Stripe payment UI',()=>{
 it('shows a loading state until checkout is ready',()=>{
  state.result={type:'loading'};
  const html=renderToStaticMarkup(<StripePaymentForm/>);
  expect(html).toContain('Loading secure payment');expect(html).not.toContain('data-payment-element');
 });
 it('retains session errors and cart recovery links',()=>{
  state.result={type:'error',error:{message:'Session expired'}};
  const html=renderToStaticMarkup(<StripePaymentForm/>);
  expect(html).toContain('Session expired');expect(html).toContain('href="/cart"');
 });
 it.each([false,true])('only enables payment when Stripe can confirm: %s',(canConfirm)=>{
  state.result={type:'success',checkout:{canConfirm,total:{total:{amount:'$42.00'}}}};
  const html=renderToStaticMarkup(<StripePaymentForm/>);
  expect(html).toContain('data-payment-element');expect(html).toContain('Pay $42.00');
  expect(html.includes('disabled=""')).toBe(!canConfirm);
 });
});
