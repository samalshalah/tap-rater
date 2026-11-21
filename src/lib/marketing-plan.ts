import {z} from 'zod';
import type Stripe from 'stripe';

export const marketingPurchaseSchema=z.object({cadence:z.literal('month'),locations:z.number().int().min(1).max(10),acceptedTerms:z.literal(true)}).strict();
export type MarketingPurchase=z.infer<typeof marketingPurchaseSchema>;
export const marketingPlan={name:'Tap Rater Google Reviews',monthlyCents:2900,replies:1000,fixes:10,keywords:3,points:588,updates:4} as const;
export function marketingAmount(p:Pick<MarketingPurchase,'cadence'|'locations'>){return marketingPlan.monthlyCents*p.locations;}
export function marketingLineItem(p:MarketingPurchase):Stripe.Checkout.SessionCreateParams.LineItem {
 return {quantity:p.locations,price_data:{currency:'usd',unit_amount:2900,recurring:{interval:p.cadence},product_data:{name:marketingPlan.name,description:'Per location: review imports and 1,000 AI reply drafts monthly. Submit replies to Google in one click, with optional 4–5-star autopilot.',metadata:{tap_rater:'marketing_growth_v1'}}}};
}
export function addMarketingToCheckout(params:Stripe.Checkout.SessionCreateParams,p:MarketingPurchase,customerId:string,attempt:string){
 if(params.mode==='subscription')throw Error('Buy the marketing package separately from a Multi-Link subscription.');
 const {payment_intent_data:_,invoice_creation:__,customer_creation:___,...base}=params;
 return {...base,mode:'subscription' as const,line_items:[...(params.line_items??[]),marketingLineItem(p)],
 subscription_data:{metadata:{tap_rater:'marketing_growth_v1',account_id:customerId,purchase_attempt:attempt,reviews_mode:'standard',...(params.metadata?.reviews_preview_id?{reviews_preview_id:String(params.metadata.reviews_preview_id)}:{})}},
 metadata:{...params.metadata,due_today_cents:String(Number(params.metadata?.due_today_cents??0)+marketingAmount(p)),marketing_account:customerId,marketing_attempt:attempt,marketing_cadence:p.cadence,marketing_locations:String(p.locations),create_account:'true',marketing_only:params.metadata?.marketing_only==='true'?'true':'false'},
 custom_text:{submit:{message:'Renews monthly until canceled. If you cancel, service continues until the end of the paid month, then stops. No refunds for unused days.'}}};
}
