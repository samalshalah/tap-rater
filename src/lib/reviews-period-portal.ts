import {getStripeClient,getStripeMode} from './checkout';
import {liveDb} from './google-business/live-reviews';

/** A separate portal configuration: never edit the one used by existing accounts or stands. */
export async function reviewsPeriodPortalConfiguration(){
 const sql=liveDb(),mode=getStripeMode();
 const [saved]=await sql`SELECT configuration_id FROM reviews_period_portal_configs WHERE stripe_mode=${mode}`;
 if(saved?.configuration_id)return String(saved.configuration_id);
 const configuration=await getStripeClient().billingPortal.configurations.create({
  business_profile:{headline:'Manage your Google Reviews subscription'},
  features:{invoice_history:{enabled:true},payment_method_update:{enabled:true},
   subscription_cancel:{enabled:true,mode:'at_period_end'},subscription_update:{enabled:false}}
 },{idempotencyKey:`reviews-period-portal-v1:${mode}`});
 const [row]=await sql`INSERT INTO reviews_period_portal_configs(stripe_mode,configuration_id) VALUES(${mode},${configuration.id})
  ON CONFLICT(stripe_mode) DO UPDATE SET stripe_mode=EXCLUDED.stripe_mode RETURNING configuration_id`;
 return String(row.configuration_id);
}
