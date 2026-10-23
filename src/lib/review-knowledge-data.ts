import {z} from 'zod';
const text=z.string().trim().max(2000).default('');
export const reviewKnowledgeSchema=z.object({
 enabled:z.boolean().default(true),
 policies:text,complaints:text,services:text,rules:text,
 contact:z.string().trim().max(300).default(''),
 language:z.enum(['match','English','Arabic','Spanish','French']).default('match'),
 length:z.enum(['standard','detailed']).default('standard'),
 style:z.enum(['friendly','professional','personal','short']).default('friendly')
}).strict();
export type ReviewKnowledge=z.infer<typeof reviewKnowledgeSchema>;
export const emptyReviewKnowledge:ReviewKnowledge=reviewKnowledgeSchema.parse({});
