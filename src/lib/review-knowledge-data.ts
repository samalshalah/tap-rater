import {z} from 'zod';
export const defaultReviewPolicies="Write naturally, politely and professionally. Avoid repeating the customer's wording or using the same response every time.\nFor complaints or mixed feedback, acknowledge the concern and invite the customer to contact the business privately.\nUse only this location's verified public business phone, email or website. Never invent contact information.\nNever disclose personal information, order details, payment information or private conversations. Do not request these details publicly.\nDo not argue, blame the customer or accuse them of posting a fake review.\nDo not invent refunds, compensation, investigations, staff actions or promises of a resolution.\nNever offer incentives or pressure customers to change or remove a review.\nKeep 1–3-star replies as drafts for client approval and manual submission.";
const text=z.string().trim().max(2000).default('');
export const reviewKnowledgeSchema=z.object({
 enabled:z.boolean().default(true),
 policies:z.string().trim().max(2000).default(defaultReviewPolicies),complaints:text,services:text,rules:text,
 contact:z.string().trim().max(300).default(''),
 language:z.enum(['match','English','Arabic','Spanish','French']).default('match'),
 length:z.enum(['standard','detailed']).default('standard'),
 style:z.enum(['friendly','professional','personal','short']).default('friendly')
}).strict();
export type ReviewKnowledge=z.infer<typeof reviewKnowledgeSchema>;
export const emptyReviewKnowledge:ReviewKnowledge=reviewKnowledgeSchema.parse({});
