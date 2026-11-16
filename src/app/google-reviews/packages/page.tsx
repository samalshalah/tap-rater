import Link from 'next/link';
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
 return <main className="tr-container tr-section"><div className="mx-auto max-w-2xl space-y-5"><Link href="/google-reviews" className="text-sm text-brand underline">About Google Reviews</Link><h1 className="text-3xl font-semibold">Manage your Google reviews</h1>{params.checkout==='cancelled'&&<p role="status">You returned from checkout. Check Subscription management if you completed payment. Your existing service access is unchanged.</p>}<MarketingPurchaseCard available guest={!auth.session} serviceManaged={serviceManaged}/></div></main>;
}
