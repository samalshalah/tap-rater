import {MarketingPurchaseCard} from '@/components/account/marketing-purchase';
import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
import {requireCustomerApi} from '@/lib/customer-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Tap Rater Growth · Reviews, GBP AI & Heat Maps',description:'$29/month per location. Buy Growth on its own or with a Google review stand.'};
export default async function Growth(){const auth=await requireCustomerApi();return <main className="tr-container tr-section"><h1 className="mb-5 text-3xl font-semibold">Grow your local presence</h1><MarketingPurchaseCard available={marketingCheckoutEnabled()} guest={!auth.session}/></main>}
