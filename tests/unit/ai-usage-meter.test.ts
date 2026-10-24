import {describe,it,expect,vi} from 'vitest';
import {aiRate,measuredAiUsage,meterAiCall,providerFailureCategory} from '@/lib/ai-usage-meter';
import {aiUsageTotals,adminAiUsage} from '@/lib/admin-ai-usage';
import {aiCostMoney} from '@/components/admin/ai-usage-cost';
const context={customerId:'22222222-2222-4222-8222-222222222222',businessId:'11111111-1111-4111-8111-111111111111',service:'review_manual' as const};
describe('private AI metering',()=>{
 it('calculates exact gross cost from measured tokens, including tiny calls',()=>{
  expect(measuredAiUsage({usage:{prompt_tokens:1000,completion_tokens:200}})).toEqual({input:1000,output:200,cost:743600});
  expect(aiCostMoney(293)).toBe('$0.000000293');
  expect(measuredAiUsage({usage:{prompt_tokens:0,completion_tokens:0}})?.cost).toBe(0);
 });
 it.each([{}, {usage:{prompt_tokens:1}}, {usage:{prompt_tokens:-1,completion_tokens:3}}, {usage:{prompt_tokens:'3',completion_tokens:2}}, {usage:{prompt_tokens:1.5,completion_tokens:2}}])('never treats missing or invalid usage as zero',r=>expect(measuredAiUsage(r)).toBeNull());
 it('records before inference and excludes prompt, output, and private fields from SQL',async()=>{
  const sql=vi.fn().mockResolvedValue([{id:'event'}]);
  const invoke=vi.fn().mockImplementation(async()=>{expect(sql).toHaveBeenCalledTimes(1);return {response:'SECRET_OUTPUT',usage:{prompt_tokens:1000,completion_tokens:200}};});
  await meterAiCall(context,aiRate.model,{messages:['SECRET_PROMPT']},invoke,sql as never);
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(sql.mock.calls[1]).toContain(743600);
  expect(JSON.stringify(sql.mock.calls)).not.toMatch(/SECRET/);
 });
 it('fails closed before inference when the attribution insert fails or has no active owner',async()=>{
  const invoke=vi.fn();
  for(const sql of [vi.fn().mockRejectedValue(Error('db unavailable')),vi.fn().mockResolvedValue([])])await expect(meterAiCall(context,aiRate.model,{},invoke,sql as never)).rejects.toThrow();
  expect(invoke).not.toHaveBeenCalled();
 });
 it('marks provider failures as unknown without persisting exception payloads',async()=>{
  const sql=vi.fn().mockResolvedValue([{id:'event'}]);
  await expect(meterAiCall(context,aiRate.model,{},async()=>{throw Error('SECRET_PROVIDER_ERROR');},sql as never)).rejects.toThrow('not confirmed');
  expect(sql.mock.calls[1][0].join('')).toContain("status='provider_error'");
  expect(JSON.stringify(sql.mock.calls)).not.toContain('SECRET');
 });
 it('retries only the ledger update after a lost database acknowledgement',async()=>{
  const sql=vi.fn().mockResolvedValueOnce([{id:'event'}]).mockRejectedValueOnce(Error('lost acknowledgement')).mockResolvedValueOnce([]);
  const invoke=vi.fn().mockResolvedValue({usage:{prompt_tokens:1,completion_tokens:2}});
  await meterAiCall(context,aiRate.model,{},invoke,sql as never);
  expect(invoke).toHaveBeenCalledTimes(1);expect(sql).toHaveBeenCalledTimes(3);
  expect(sql.mock.calls[1].slice(1)).toEqual(sql.mock.calls[2].slice(1));
 });
 it('retains an unknown-cost event if the provider omits usage',async()=>{
  const sql=vi.fn().mockResolvedValue([{id:'event'}]);
  await meterAiCall(context,aiRate.model,{},async()=>({response:'text'}),sql as never);
  expect(sql.mock.calls[1]).toContain('usage_missing');expect(sql.mock.calls[1].filter(v=>v===null)).toHaveLength(3);
 });
 it('does not accept an unpriced model',async()=>{
  const invoke=vi.fn(),sql=vi.fn();
  await expect(meterAiCall(context,'new-model',{},invoke,sql as never)).rejects.toThrow('not configured');
  expect(sql).not.toHaveBeenCalled();expect(invoke).not.toHaveBeenCalled();
 });
 it('keeps clients and locations separate and strips content from aggregates',async()=>{
  const sql=vi.fn().mockResolvedValueOnce([
   {customer_id:'a',business_id:'1',calls:2,measured:1,unknown:1,input:10,output:20,cost:47990,draft:'SECRET'},
   {customer_id:'a',business_id:'2',calls:1,measured:1,cost:100},
   {customer_id:'b',business_id:'3',calls:1,measured:1,cost:900},
  ]).mockResolvedValueOnce([{started_at:'2026-10-22T21:00:00Z'}]);
  const result=await adminAiUsage(sql as never);
  expect(result.accounts.a.totals.costNano).toBe(48090);expect(result.accounts.a.locations).toHaveLength(2);
  expect(result.accounts.b.totals.costNano).toBe(900);
  expect(JSON.stringify(result)).not.toContain('SECRET');
  expect(aiUsageTotals({content:'SECRET'}).costNano).toBe(0);
 });
});

it('classifies provider failures without exposing their messages',()=>{
 expect(providerFailureCategory(Error("JSON Mode couldn't be met: SECRET"))).toBe('structured_output');
 expect(providerFailureCategory(Error('429 quota SECRET'))).toBe('capacity');
 expect(providerFailureCategory(Error('SECRET'))).toBe('unclassified');
});
