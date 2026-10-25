import {redirect} from 'next/navigation';
import {requireCustomer} from '@/lib/customer-auth';
import {getCustomerExperience} from '@/lib/customer-experience';
import {AccountShell} from '@/components/account/account-shell';
import {StandsOverview} from '@/components/account/stands-overview';
export default async function StandsOverviewPage(){
 const session=await requireCustomer();
 const {portal,service,stands}=await getCustomerExperience(session.email);
 if(service&&!stands)redirect('/account');
 return <AccountShell overview><StandsOverview portal={portal}/></AccountShell>;
}
