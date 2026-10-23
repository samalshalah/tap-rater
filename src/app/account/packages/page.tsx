import {AccountShell} from '@/components/account/account-shell';
import {requireCustomer} from '@/lib/customer-auth';
import {MarketingPurchaseCard} from '@/components/account/marketing-purchase';
import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
export const dynamic='force-dynamic';
export default async function Packages(){await requireCustomer();return <AccountShell><h1 className="mb-4 text-2xl font-semibold">Marketing package</h1><MarketingPurchaseCard available={marketingCheckoutEnabled()}/></AccountShell>}
