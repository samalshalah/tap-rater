// Internal scenario only. Never used by checkout, entitlements, or billing.
export const proposedPlans=[
 {name:'Essentials',price:19,replies:100,fixes:2,points:300},
 {name:'Growth',price:29,replies:300,fixes:10,points:980},
 {name:'Pro',price:49,replies:1000,fixes:25,points:1960},
] as const;
export function modelPlan(index:number,locations:number){
 const p=proposedPlans[index];
 if(!p||!Number.isInteger(locations)||locations<1||locations>10)return null;
 const revenue=index===1?29+Math.min(locations-1,4)*19+Math.max(locations-5,0)*15:p.price*locations;
 const ai=(p.replies+p.fixes)*0.003132*1.25*locations,heat=p.points*0.0006*locations;
 const operations=8*locations,fees=revenue*0.036+0.30,cost=ai+heat+operations+fees;
 return {revenue,ai,heat,operations,fees,cost,contribution:revenue-cost,margin:(revenue-cost)/revenue};
}
