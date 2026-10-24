import {describe,it,expect} from 'vitest';
import {proofHistory,publicProofHistory} from '@/lib/stand-proof-history';
describe('private proof history',()=>{
 it('preserves the current legacy proof and approval exactly once',()=>{const item:any={setup:{customerProof:{storageKey:'private-key',contentType:'image/png',uploadedAt:'2026-10-23'},customerProofApproval:{version:'approved',approvedAt:'2026-10-24'}}};const entries=proofHistory(item);expect(entries.map(e=>e.action)).toEqual(['uploaded','approved']);item.setup.customerProofHistory=entries;expect(proofHistory(item)).toHaveLength(2);expect(JSON.stringify(publicProofHistory(item))).not.toContain('private-key');});
});
