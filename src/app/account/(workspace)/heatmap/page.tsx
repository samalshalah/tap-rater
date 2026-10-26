import {redirect} from 'next/navigation';
import {heatmapFeatureEnabled} from '@/lib/heatmap-feature';
import {MarketingGate} from '@/components/account/marketing-gate';
import {AccountShell} from '@/components/account/account-shell';
import {LocalDashboard} from '@/components/account/local-dashboard';
import {requireCustomer} from '@/lib/customer-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Heat Map',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{location?:string}>}){
 const session=await requireCustomer();
 if(!heatmapFeatureEnabled){const {location}=await searchParams;redirect('/account/profile'+(location?'?location='+encodeURIComponent(location):''));}
 return <AccountShell><MarketingGate email={session.email}><LocalDashboard key="heatmap" initialTab="heatmap" preferenceKey={session.email.toLowerCase()}/></MarketingGate></AccountShell>;
}
