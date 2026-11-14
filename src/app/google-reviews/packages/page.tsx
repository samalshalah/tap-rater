import {notFound} from 'next/navigation';
import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
import {requireCustomerApi} from '@/lib/customer-auth';
import {MarketingPurchaseCard} from '@/components/account/marketing-purchase';
export const dynamic='force-dynamic';
export const metadata={title:'Google Reviews package',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{checkout?:string}>}){
 if(!marketingCheckoutEnabled())notFound();
 const auth=await requireCustomerApi();const params=await searchParams;
 return <main className="tr-container tr-section"><div className="mx-auto max-w-2xl space-y-5"><h1 className="text-3xl font-semibold">Manage your Google reviews</h1>{params.checkout==='cancelled'&&<p role="status">You returned from checkout. No service access is granted until payment is confirmed. You can retry your checkout or check Subscription management if you completed payment.</p>}<MarketingPurchaseCard available guest={!auth.session}/></div></main>;
}
