import {it,expect} from 'vitest';
import {defaultReviewPolicies,reviewKnowledgeSchema} from '@/lib/review-knowledge-data';
it('provides editable defaults without replacing explicit custom or cleared policies',()=>{
 expect(reviewKnowledgeSchema.parse({}).policies).toBe(defaultReviewPolicies);
 expect(reviewKnowledgeSchema.parse({policies:'Our own policy'}).policies).toBe('Our own policy');
 expect(reviewKnowledgeSchema.parse({policies:''}).policies).toBe('');
 expect(defaultReviewPolicies.length).toBeLessThan(2000);
});
