import {NextResponse} from 'next/server';
import {requireAdminApi} from '@/lib/admin-auth';
import {adminFailureNotifications} from '@/lib/admin-failure-notifications';
export const dynamic='force-dynamic';
export async function GET(){
 const denied=await requireAdminApi();if(denied)return denied;
 try{return NextResponse.json(await adminFailureNotifications(),{headers:{'Cache-Control':'private, no-store'}});}
 catch{return NextResponse.json({error:'Notifications could not be loaded.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
