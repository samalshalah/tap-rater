import Link from 'next/link';
import {requireCustomer} from '@/lib/customer-auth';
import {emailLocations} from '@/lib/review-email-preferences';
import {ReviewNotificationLocations} from '@/components/account/review-notification-locations';
import {AccountShell} from '@/components/account/account-shell';
import {WorkspacePageHeader} from '@/components/account/workspace-ui';
export const dynamic='force-dynamic';
export const metadata={title:'Review notifications',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{location?:string}>}){
 const session=await requireCustomer();
 const [locations,{location}]=await Promise.all([emailLocations(session.email),searchParams]);
 // The Workspace picker narrows the list to one location; "All locations" shows every card.
 const selected=locations.find(row=>row.id===location);
 const shown=(selected?[selected]:locations).map(row=>({id:row.id,name:row.business_name,settings:{businessId:row.id,
  version:row.version??0,lowMode:row.low_mode??'off',highMode:row.high_mode??'off',weekly:row.weekly??false,
  monthly:row.monthly??false,hour:row.delivery_hour??9,zone:row.zone??'America/New_York'}}));
 return <AccountShell><WorkspacePageHeader title="Review notifications" subtitle="Choose which review emails you receive for each location."/>
 {shown.length?<ReviewNotificationLocations locations={shown} email={session.email}/>:
 <p>Connect a Google Reviews location to choose your notifications. <Link className="underline" href="/account/locations">Manage locations</Link></p>}</AccountShell>;
}
