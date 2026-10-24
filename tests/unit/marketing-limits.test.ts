import {it,expect,vi} from 'vitest';
import {marketingLimitsInput} from '@/lib/marketing-limits';
import {generateIssueDraft} from '@/lib/local-issue-ai';
import {detectLocalIssues} from '@/lib/local-issue-rules';
it('rejects prices, invalid limits and duplicate location assignments',()=>{
 const input={customerId:'9fc0deba-bb6d-4c2c-8279-a4b852212523',version:1,status:'testing',expiresAt:null,locationLimit:2,aiMonthlyLimit:10,heatmapMonthlyPoints:100,enabledLocations:[]};
 expect(marketingLimitsInput.safeParse(input).success).toBe(true);
 for(const patch of [{aiMonthlyLimit:-1},{locationLimit:1.5},{price:10},{enabledLocations:[input.customerId,input.customerId]}])expect(marketingLimitsInput.safeParse({...input,...patch}).success).toBe(false);
});
it('keeps facts for two different clients separate without Norah-specific instructions',async()=>{
 const run=vi.fn().mockResolvedValue({response:{summary:'Confirm this location’s actual details.',steps:['Ask the owner to confirm the proposed changes.'],proposedDescription:'',questions:[]}});
 for(const business of ['Cafe North','Repair South'])await generateIssueDraft({business,verifiedGoogleFacts:{hours:business==='Cafe North'?'Monday 08:00–16:00':'Sunday closed'}},run);
 const [north,south]=run.mock.calls.map(c=>JSON.stringify(c[1]));
 expect(north).not.toContain('Repair South');expect(south).not.toContain('Cafe North');
 for(const prompt of [north,south]){expect(prompt).not.toContain('noon–6');expect(prompt).toContain('Never reuse facts from another business');}
});
it('detects repeated descriptions for any industry without judging accurate long descriptions',()=>{
 const observed={description:'We repair appliances with care. We repair appliances with care.',phone:'123',website:'https://example.test',hours:'Monday 8–5',categories:'Repair shop',specialHours:'2099-12-25: Closed'};
 expect(detectLocalIssues({observed,draft:null,synced_at:'2026-10-23'},[],[]).some(f=>f.code==='profile-description')).toBe(true);
 expect(detectLocalIssues({observed:{...observed,description:'A'.repeat(600)},draft:null,synced_at:'2026-10-23'},[],[])).toEqual([]);
});
