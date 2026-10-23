import {it,expect,vi} from 'vitest';
import {profileChecks} from '@/lib/google-business/profile-audit';
import {detectLocalIssues} from '@/lib/local-issue-rules';
import {generateIssueDraft} from '@/lib/local-issue-ai';
const now=new Date('2026-10-23T12:00:00Z');
const observed={description:'A clothing boutique.',phone:'123',website:'https://example.com',hours:'Sunday noon–6 pm',categories:'Boutique',specialHours:'2024-12-25: Closed\n2025-01-01: Closed'};
it('reports past special hours as a confirmation task, not a proven Google error',()=>{
 const issues=detectLocalIssues({observed,draft:null,synced_at:'2026-10-22'},[],[],now);
 expect(issues).toHaveLength(1);expect(issues[0]).toMatchObject({code:'profile-special-hours',aiEligible:true});
 expect(issues[0].evidence).toContain('does not prove');expect(issues[0].improvement).toContain('Keep regular Sunday hours unchanged');
 expect(detectLocalIssues({observed:{...observed,specialHours:'2026-12-25: Closed'},draft:null,synced_at:'2026-10-22'},[],[],now)).toEqual([]);
});
it('does not claim unqueried photos, products or website defects',()=>{
 const checks=profileChecks(observed,now);expect(checks).toHaveLength(8);
 expect(checks.find(c=>c.key==='hours')?.status).toBe('present');expect(checks.find(c=>c.key==='specialHours')?.status).toBe('needs_confirmation');
 expect(checks.find(c=>c.key==='address')?.status).toBe('needs_confirmation');
 expect(JSON.stringify(checks)).not.toContain('score');
});
it('keeps location data independent and does not mutate observed facts',()=>{
 const before=JSON.stringify(observed);profileChecks(observed,now);const other=profileChecks({phone:''},now);
 expect(other.find(c=>c.key==='phone')?.status).toBe('needs_confirmation');expect(profileChecks(observed,now).find(c=>c.key==='phone')?.status).toBe('present');expect(JSON.stringify(observed)).toBe(before);
});
it('directs AI to prepare drafts without external update steps or invented holiday hours',async()=>{
 const run=vi.fn().mockResolvedValue({response:{summary:'Confirm upcoming exceptions.',steps:['Ask the owner to confirm upcoming holiday closures before saving a draft.'],proposedDescription:'',questions:['Will any upcoming holiday change your regular opening hours?']}});
 await generateIssueDraft({verifiedGoogleFacts:observed},run);const prompt=JSON.stringify(run.mock.calls[0][1]);
 expect(prompt).toContain('Do not include a step to publish');expect(prompt).toContain('never infer holiday opening times');expect(prompt).toContain('preserve noon–6 pm');
});
