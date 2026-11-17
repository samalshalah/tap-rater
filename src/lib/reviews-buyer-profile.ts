import {z} from 'zod';
const name=z.string().trim().min(1).max(50);
export const reviewsBuyerProfileSchema=z.object({
 firstName:name,lastName:name,
 phone:z.string().trim().max(40).regex(/^[+0-9().\s-]*$/).refine(v=>!v||(v.replace(/\D/g,'').length>=7&&v.replace(/\D/g,'').length<=15)).optional().default('')
});
export type ReviewsBuyerProfile=z.infer<typeof reviewsBuyerProfileSchema>;
