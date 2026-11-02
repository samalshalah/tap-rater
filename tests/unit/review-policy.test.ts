import {expect,it,vi} from 'vitest';
import {assessReviewPolicy} from '@/lib/review-policy';

it('skips inference on an empty review and rejects invented evidence',async()=>{
 const run=vi.fn().mockResolvedValue({response:{finding:'possible',reason:'advertising',quote:'Buy my products'}});
 expect(await assessReviewPolicy('   ',run)).toEqual({finding:'rating_only'});
 expect(run).not.toHaveBeenCalled();
 await expect(assessReviewPolicy('The bill was too high.',run)).rejects.toThrow('evidence');
});
it('rejects harassment attributed to the merchant instead of the reviewer',async()=>{
 const run=vi.fn().mockResolvedValueOnce({response:{finding:'possible',reason:'harassment',quote:'he threatened me'}})
   .mockResolvedValueOnce({response:{supported:false}});
 expect(await assessReviewPolicy('During my visit he threatened me.',run)).toEqual({finding:'no_issue'});
});
it('accepts a supported conflict of interest and keeps private identifiers out of excerpts',async()=>{
 const text='I work for their competitor. Contact sales@example.test.';
 const run=vi.fn().mockResolvedValueOnce({response:{finding:'possible',reason:'conflict_of_interest',quote:text}})
   .mockResolvedValueOnce({response:{supported:true}});
 expect(await assessReviewPolicy(text,run)).toEqual({finding:'possible',reason:'conflict_of_interest',evidence:'I work for their competitor. Contact [email hidden].'});
});
