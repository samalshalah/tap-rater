import {z} from 'zod';

// Operational entitlements only. No price, checkout or charge is created here.
export const marketingLimitsInput=z.object({
 customerId:z.string().uuid(),version:z.number().int().nonnegative(),
 status:z.enum(['testing','active','inactive']),
 expiresAt:z.string().datetime({offset:true}).nullable(),
 locationLimit:z.number().int().min(0).max(1000),
 unlimitedLocations:z.boolean().default(false),
 aiMonthlyLimit:z.number().int().min(0).max(100000),
 heatmapMonthlyPoints:z.number().int().min(0).max(1000000),
 enabledLocations:z.array(z.string().uuid()).max(1000).refine(ids=>new Set(ids).size===ids.length,'Choose each location once.'),
}).strict();

export type MarketingLimitsInput=z.infer<typeof marketingLimitsInput>;
export const marketingMonthSql="date_trunc('month',now() AT TIME ZONE 'America/New_York')::date";
