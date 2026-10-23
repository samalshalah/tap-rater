import {z} from 'zod';

const text=z.string().max(5000);
const url=z.string().max(2048).refine(v=>!v||/^https?:\/\//i.test(v),'Use an http or https URL.');
export const businessDetails=z.object({
 brand:text.optional(),street:text.optional(),city:text.optional(),region:text.optional(),postalCode:text.optional(),country:text.optional(),
 additionalPhones:text.optional(),socialLinks:text.optional(),serviceAreas:text.optional(),moreHours:text.optional(),services:text.optional(),
 paymentMethods:text.optional(),attributes:text.optional(),featuredMessage:text.optional(),featuredUrl:url.optional(),
 latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),
 addressVisibility:z.enum(['unknown','visible','hidden']).optional(),openStatus:z.enum(['unknown','OPEN','CLOSED_TEMPORARILY','CLOSED_PERMANENTLY']).optional(),
 logo:url.optional(),cover:url.optional(),
 media:z.array(z.object({name:z.string().max(1000),url,thumbnail:url.optional(),format:z.string().max(30),category:z.string().max(100),description:text.optional()})).max(1000).optional(),
 mediaStatus:z.enum(['complete','unavailable','partial']).optional(),attributesStatus:z.enum(['complete','unavailable']).optional(),
 categoryIds:z.array(z.string().max(200)).max(30).optional(),
}).strict();
export type BusinessDetails=z.infer<typeof businessDetails>;

/** Enrichment fills newly supported fields without replacing any saved client edits. */
export function mergeBusinessDraft<T extends {details?:BusinessDetails}>(observed:T,draft:T|null):T {
 return draft?{...observed,...draft,details:{...observed.details,...draft.details}}:observed;
}
