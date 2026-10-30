import {redirect} from 'next/navigation';
import {requireCustomer} from '@/lib/customer-auth';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{location?:string}>}){
 await requireCustomer();
 const {location}=await searchParams;
 redirect('/account/reviews'+(location?'?location='+encodeURIComponent(location):''));
}
