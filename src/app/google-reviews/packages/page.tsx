import {redirect} from 'next/navigation';
export const metadata={robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{checkout?:string}>}){
 const params=await searchParams;
 redirect(params.checkout==='cancelled'?'/google-reviews?checkout=cancelled#plan':'/google-reviews#plan');
}
