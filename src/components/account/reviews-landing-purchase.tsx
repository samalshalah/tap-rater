import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
import {requireCustomerApi} from '@/lib/customer-auth';
import {hasCustomerMarketingAccess} from '@/lib/customer-marketing-access';
import {MarketingPurchaseCard} from './marketing-purchase';
import styles from './reviews-checkout.module.css';
import Link from 'next/link';

export async function ReviewsLandingPurchase({cancelled=false,focused=false}:{cancelled?:boolean;focused?:boolean}={}){
 if(!marketingCheckoutEnabled())return <section id="plan" aria-label="Google Reviews plan" className={focused?styles.setupSection:styles.landingPlan}><div className={styles.container}><h2 className="text-xl font-semibold">New subscriptions are currently unavailable</h2><p className="mt-3 text-sm text-muted">Already a customer? Your existing account is still available.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/account/reviews" className="tr-button-primary">Open your workspace</Link><Link href="/contact-us" className="tr-button-ghost">Contact us</Link></div></div></section>;
 const auth=await requireCustomerApi();
 const serviceManaged=auth.session?await hasCustomerMarketingAccess(auth.session.email):false;
 return <section id="plan" aria-label="Google Reviews plan" className={focused?styles.setupSection:styles.landingPlan}><div className={styles.container}>
  {cancelled&&<p role="status" className="mb-4 text-sm text-muted">Checkout closed. Your existing access is unchanged.</p>}
  <MarketingPurchaseCard storefront focused={focused} available guest={!auth.session} serviceManaged={serviceManaged}/>
 </div></section>;
}
