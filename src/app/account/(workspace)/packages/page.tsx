import {WorkspacePageHeader} from '@/components/account/workspace-ui';
import {AccountShell} from '@/components/account/account-shell';
import {requireCustomer} from '@/lib/customer-auth';
import {MarketingPurchaseCard} from '@/components/account/marketing-purchase';
import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
export const dynamic='force-dynamic';
export default async function Packages(){await requireCustomer();return <AccountShell><WorkspacePageHeader title="Packages"/><MarketingPurchaseCard available={marketingCheckoutEnabled()}/></AccountShell>}
