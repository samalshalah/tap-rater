// Internal scenario only. Never used by checkout, entitlements, or billing.
export const proposedPlans=[
 {name:'Essentials',price:19,replies:100,fixes:2,points:300},
 {name:'Growth',price:29,replies:300,fixes:10,points:980},
 {name:'Pro',price:49,replies:1000,fixes:25,points:1960},
] as const;
export type PlanInputs={price:number;replies:number;fixes:number;support:number;growthAdditional:number;growthSixPlus:number};
export const defaultPlanInputs=proposedPlans.map(p=>({price:p.price,replies:p.replies,fixes:p.fixes,support:5,growthAdditional:19,growthSixPlus:15}));
export function validPlanInputs(p:PlanInputs){
 return [p.price,p.support,p.growthAdditional,p.growthSixPlus].every(v=>Number.isFinite(v)&&v>=0&&v<=100000)
  &&[p.replies,p.fixes].every(v=>Number.isInteger(v)&&v>=0&&v<=1000000);
}
export function modelPlan(index:number,locations:number,inputs:PlanInputs=defaultPlanInputs[index]){
 const base=proposedPlans[index],p=inputs;
 if(!base||!p||!validPlanInputs(p)||!Number.isInteger(locations)||locations<1||locations>10)return null;
 const revenue=index===1?p.price+Math.min(locations-1,4)*p.growthAdditional+Math.max(locations-5,0)*p.growthSixPlus:p.price*locations;
 const ai=(p.replies+p.fixes)*0.003132*1.25*locations,heat=base.points*0.0006*locations;
 const operations=(3+p.support)*locations,fees=revenue*0.036+0.30,cost=ai+heat+operations+fees;
 return {revenue,ai,heat,operations,fees,cost,contribution:revenue-cost,margin:revenue>0?(revenue-cost)/revenue:null};
}
