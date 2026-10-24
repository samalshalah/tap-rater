import {it,expect,vi} from 'vitest';
import {detectLocalIssues} from '@/lib/local-issue-rules';
import {generateIssueDraft} from '@/lib/local-issue-ai';
const track={id:'a',active:true,keyword:'boutique',size:3 as const,spacingKm:1 as const,language:'en' as const};
const profile={observed:{description:'A clothing boutique.',phone:'123',website:'https://example.com',hours:'Sunday 12–6',categories:'Boutique',specialHours:'2099-12-25: Closed'},draft:null,synced_at:'2026-10-22'};
const scan=(state:string,rank:number|null)=>({methodology:'maps-v2',created_at:'2026-10-22',tracks:[{id:'a',settings:track}],points:Array.from({length:9},()=>({trackId:'a',state,rank}))});
it('never sells an AI fix for missing, legacy, failed or pending measurements',()=>{
 expect(detectLocalIssues(profile,[track],[])[0]).toMatchObject({kind:'system',aiEligible:false});
 expect(detectLocalIssues(profile,[track],[{...scan('complete',null),methodology:'maps-v1'}])[0].aiEligible).toBe(false);
 expect(detectLocalIssues(profile,[track],[scan('error',null)])[0]).toMatchObject({aiEligible:false});
 expect(detectLocalIssues(profile,[track],[scan('pending',null)])).toEqual([]);
});
it('uses exact keyword settings and completed measurements, not old areas',()=>{
 expect(detectLocalIssues(profile,[{...track,spacingKm:2}],[scan('complete',1)])[0].code).toBe('scan-required:a');
 expect(detectLocalIssues(profile,[track],[scan('complete',1)])).toEqual([]);
 const finding=detectLocalIssues(profile,[track],[scan('complete',null)])[0];expect(finding.evidence).toContain('0/9');expect(finding.aiEligible).toBe(true);
});
it('reports missing facts as confirmation tasks without inventing them',()=>{
 const findings=detectLocalIssues({...profile,observed:{...profile.observed,hours:''},draft:{}},[],[]);
 expect(findings.map(f=>f.code)).toEqual(['profile-missing','profile-draft']);expect(findings[1].aiEligible).toBe(false);
});
it('validates AI output and instructs it to avoid publishing or invented facts',async()=>{
 const run=vi.fn().mockResolvedValue({response:JSON.stringify({summary:'Review factual details.',steps:['Confirm the actual opening hours.'],proposedDescription:'',questions:['What are the opening hours?']})});
 expect((await generateIssueDraft({issue:'test'},run)).questions).toHaveLength(1);
 expect(JSON.stringify(run.mock.calls[0][1])).toContain('Do not invent hours');
 run.mockResolvedValue({response:{summary:'bad'}});await expect(generateIssueDraft({},run)).rejects.toThrow();
});
