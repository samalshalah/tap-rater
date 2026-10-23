import {z} from 'zod';
import type Stripe from 'stripe';

export const marketingPurchaseSchema=z.object({cadence:z.literal('month'),locations:z.number().int().min(1).max(10),acceptedTerms:z.literal(true)}).strict();
export type MarketingPurchase=z.infer<typeof marketingPurchaseSchema>;
export const marketingPlan={name:'Tap Rater Growth',monthlyCents:2900,replies:300,fixes:10,keywords:3,points:588,updates:4} as const;
export function marketingAmount(p:Pick<MarketingPurchase,'cadence'|'locations'>){return marketingPlan.monthlyCents*p.locations;}
export function marketingLineItem(p:MarketingPurchase):Stripe.Checkout.SessionCreateParams.LineItem {
 return {quantity:p.locations,price_data:{currency:'usd',unit_amount:2900,recurring:{interval:p.cadence},product_data:{name:marketingPlan.name,description:'Per location: 300 review reply drafts, 10 GBP improvement drafts and 3 keywords with 4 ranking updates monthly. Publishing disabled.',metadata:{tap_rater:'marketing_growth_v1'}}}};
}
export function addMarketingToCheckout(params:Stripe.Checkout.SessionCreateParams,p:MarketingPurchase,customerId:string,attempt:string){
 if(params.mode==='subscription')throw Error('Buy the marketing package separately from a Multi-Link subscription.');
 const {payment_intent_data:_,invoice_creation:__,customer_creation:___,...base}=params;
 return {...base,mode:'subscription' as const,line_items:[...(params.line_items??[]),marketingLineItem(p)],
 subscription_data:{metadata:{tap_rater:'marketing_growth_v1',account_id:customerId,purchase_attempt:attempt}},
 metadata:{...params.metadata,due_today_cents:String(Number(params.metadata?.due_today_cents??0)+marketingAmount(p)),marketing_account:customerId,marketing_attempt:attempt,marketing_cadence:p.cadence,marketing_locations:String(p.locations),create_account:'true',marketing_only:params.metadata?.marketing_only==='true'?'true':'false'},
 custom_text:{submit:{message:'Renews automatically until canceled. Cancel future renewals in your account. Replies and profile changes stay as drafts.'}}};
}
