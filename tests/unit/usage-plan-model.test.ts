import {describe,it,expect,vi} from 'vitest';
import {modelPlan,defaultPlanInputs} from '@/lib/usage-plan-model';
import {adminLocationCosts,locationCost} from '@/lib/admin-location-costs';
describe('private cost scenarios',()=>{
 it('recalculates customized prices, allowances, support and tiered prices',()=>{
  const m=modelPlan(1,3,{price:39,replies:600,fixes:20,support:10,growthAdditional:25,growthSixPlus:20})!;
  expect(m.revenue).toBe(89);expect(m.operations).toBe(39);
  expect(m.ai).toBeCloseTo(7.2819,8);
  expect(m.contribution).toBeCloseTo(37.4501,8);
  expect(defaultPlanInputs[1].price).toBe(29);
 });
 it('rejects blank, negative, fractional allowances and out of range inputs',()=>{
  for(const change of [{price:NaN},{support:-1},{replies:1.5},{fixes:1000001},{price:Infinity}])
   expect(modelPlan(1,1,{...defaultPlanInputs[1],...change})).toBeNull();
 });
 it('keeps losses visible and zero revenue margin undefined',()=>{
  const free=modelPlan(1,1,{...defaultPlanInputs[1],price:0})!;
  expect(free.revenue).toBe(0);expect(free.margin).toBeNull();expect(free.contribution).toBeLessThan(0);
 });
 it('matches the reviewed single-location economics',()=>{
  expect(modelPlan(0,1)?.cost).toBeCloseTo(9.56333,8);
  expect(modelPlan(1,1)?.contribution).toBeCloseTo(17.85435,8);
  expect(modelPlan(2,1)?.contribution).toBeCloseTo(33.747125,8);
 });
 it('uses graduated Growth pricing and only one fixed payment fee',()=>{
  const m=modelPlan(1,10)!;
  expect(m.revenue).toBe(180);expect(m.cost).toBeCloseTo(104.7965,8);
  expect(m.fees).toBeCloseTo(6.78,8);
  expect(modelPlan(1,3)?.revenue).toBe(67);
 });
 it('does not invent quotes for unsupported location counts',()=>{
  for(const n of [0,-1,1.5,11,NaN])expect(modelPlan(1,n)).toBeNull();
 });
 it('keeps only operational fields',()=>{
  const r=locationCost({customer_id:'a',business_id:'l',current_location:true,points:2,heat:1200,unknown:1,address:'private',data:'private'});
  expect(Object.keys(r)).toEqual(['accountId','id','current','points','heat','unknown']);
  expect(JSON.stringify(r)).not.toContain('private');
 });
 it('aggregates by original account and location without content or reservation double counting',async()=>{
  const sql=vi.fn().mockResolvedValue([{customer_id:'a',business_id:'l',heat:1200,points:2,unknown:1}]);
  const data=await adminLocationCosts(sql as never);
  const query=sql.mock.calls[0][0].join('');
  expect(query).toContain('GROUP BY r.customer_id,r.business_id');
  expect(query).not.toContain('sum(p.reserved_microusd)');
  expect(query).not.toContain('business_name');
  expect(data[0].heat).toBe(1200);
 });
});
