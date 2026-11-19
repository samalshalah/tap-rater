import {MarketingGate} from '@/components/account/marketing-gate';
import {AccountShell} from '@/components/account/account-shell';
import {CustomerLocations} from '@/components/account/customer-locations';
import {requireCustomer} from '@/lib/customer-auth';
import {accountBusinesses} from '@/lib/account-business-drafts';
import {emailLocations,notificationSettingsFromRow,type ReviewEmailSettings} from '@/lib/review-email-preferences';
export const dynamic='force-dynamic';
export const metadata={title:'Locations',robots:{index:false,follow:false}};
export default async function Page(){
 const session=await requireCustomer();
 // Email settings are secondary: if they fail to load, Locations still renders without the bell.
 const [businesses,prefRows]=await Promise.all([accountBusinesses(session.email),emailLocations(session.email).catch(()=>[])]);
 const notifications:Record<string,ReviewEmailSettings>=Object.fromEntries((prefRows as Parameters<typeof notificationSettingsFromRow>[0][]).map(row=>[row.id,notificationSettingsFromRow(row)]));
 return <AccountShell><MarketingGate email={session.email}><CustomerLocations businesses={businesses} notifications={notifications} email={session.email}/></MarketingGate></AccountShell>;
}
