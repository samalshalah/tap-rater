import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
import {requireCustomerApi} from '@/lib/customer-auth';
import {hasCustomerMarketingAccess} from '@/lib/customer-marketing-access';
import {MarketingPurchaseCard} from './marketing-purchase';
import styles from './reviews-checkout.module.css';

export async function ReviewsLandingPurchase({cancelled=false}:{cancelled?:boolean}={}){
 if(!marketingCheckoutEnabled())return null;
 const auth=await requireCustomerApi();
 const serviceManaged=auth.session?await hasCustomerMarketingAccess(auth.session.email):false;
 return <section id="plan" aria-label="Google Reviews plan" className={styles.landingPlan}><div className={styles.container}>
  {cancelled&&<p role="status" className="mb-4 text-sm text-muted">Checkout closed. Your existing access is unchanged.</p>}
  <MarketingPurchaseCard storefront available guest={!auth.session} serviceManaged={serviceManaged}/>
 </div></section>;
}
