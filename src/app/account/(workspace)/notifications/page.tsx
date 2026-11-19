import {redirect} from 'next/navigation';
// Review email settings now live on each Locations card (bell icon). Old links and emails still land there,
// and a ?location= link opens that location's settings popup.
export default async function Page({searchParams}:{searchParams:Promise<{location?:string}>}){
 const {location}=await searchParams;
 const id=location&&/^[0-9a-f-]{36}$/i.test(location)?location:'';
 redirect(id?`/account/locations?notify=${encodeURIComponent(id)}`:'/account/locations');
}
