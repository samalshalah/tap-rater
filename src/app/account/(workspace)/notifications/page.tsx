import Link from 'next/link';
import {requireCustomer} from '@/lib/customer-auth';
import {emailLocations} from '@/lib/review-email-preferences';
import {ReviewNotificationForm} from '@/components/account/review-notification-form';
export const dynamic='force-dynamic';
export const metadata={title:'Review notifications',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{location?:string}>}){
 const session=await requireCustomer();
 const [locations,{location}]=await Promise.all([emailLocations(session.email),searchParams]);
 const active=locations.find(row=>row.id===location)||locations[0];
 return <section className="mx-auto max-w-3xl space-y-5 p-4"><h1 className="text-3xl font-bold">Review notifications</h1>
 <p>Choose which emails you receive for each location.</p>
 {locations.length>1&&<nav className="flex flex-wrap gap-3" aria-label="Notification locations">{locations.map(row=><Link aria-current={row.id===active?.id?'page':undefined} className="underline" key={row.id} href={'/account/notifications?location='+row.id}>{row.business_name}</Link>)}</nav>}
 {active?<ReviewNotificationForm key={active.id} name={active.business_name} email={session.email} initial={{businessId:active.id,
 version:active.version??0,lowMode:active.low_mode??'off',highMode:active.high_mode??'off',weekly:active.weekly??false,
 monthly:active.monthly??false,hour:active.delivery_hour??9,zone:active.zone??'America/New_York'}}/>:
 <p>Connect a Google Reviews location to choose your notifications. <Link className="underline" href="/account/locations">Manage locations</Link></p>}</section>;
}
