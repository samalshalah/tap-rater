import Link from 'next/link';
import styles from '@/components/account/reviews-checkout.module.css';
import {notFound} from 'next/navigation';
import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
import {requireCustomerApi} from '@/lib/customer-auth';
import {hasCustomerMarketingAccess} from '@/lib/customer-marketing-access';
import {MarketingPurchaseCard} from '@/components/account/marketing-purchase';
export const dynamic='force-dynamic';
export const metadata={title:'Google Reviews package',description:'Import Google reviews and prepare editable AI reply drafts. Posting and autopilot are not included.'};
export default async function Page({searchParams}:{searchParams:Promise<{checkout?:string}>}){
 if(!marketingCheckoutEnabled())notFound();
 const auth=await requireCustomerApi();const params=await searchParams;
 const serviceManaged=auth.session?await hasCustomerMarketingAccess(auth.session.email):false;
 return <main className={styles.page}><div className={styles.container}><Link href="/google-reviews" className={styles.back}>← Google Reviews</Link><header className={styles.heading}><h1>Your Google Reviews plan</h1><p>Thoughtful replies start here.</p></header>{params.checkout==='cancelled'&&<p role="status">Checkout closed. Your existing access is unchanged.</p>}<MarketingPurchaseCard storefront available guest={!auth.session} serviceManaged={serviceManaged}/></div></main>;
}
