import {WorkspacePageHeader} from '@/components/account/workspace-ui';
import {AccountShell} from '@/components/account/account-shell';
import {requireCustomer} from '@/lib/customer-auth';
import {MarketingPurchaseCard} from '@/components/account/marketing-purchase';
import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
import {getCustomerWorkspaceExperience} from '@/lib/customer-workspace-experience';
export const dynamic='force-dynamic';
export default async function Packages(){const session=await requireCustomer(),experience=await getCustomerWorkspaceExperience(session.email);return <AccountShell><WorkspacePageHeader title="Subscription management"/><MarketingPurchaseCard available={marketingCheckoutEnabled()} serviceManaged={experience.service}/></AccountShell>}
