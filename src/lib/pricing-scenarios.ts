import {z} from 'zod';
import type {PlanInputs} from './usage-plan-model';
export const scenarioVersion='2026-10-22-v1';
const amount=z.number().finite().min(0).max(100000);
const allowance=z.number().int().min(0).max(1000000);
export const scenarioInput=z.object({
 id:z.string().uuid(),name:z.string().trim().min(1).max(80),modelVersion:z.literal(scenarioVersion),
 plans:z.array(z.object({price:amount,replies:allowance,fixes:allowance,support:amount,growthAdditional:amount,growthSixPlus:amount}).strict()).length(3),
}).strict();
export type SavedScenario={id:string;name:string;modelVersion:string;plans:PlanInputs[];createdAt:string};
