import {neon} from '@neondatabase/serverless';
import {NextResponse} from 'next/server';
import {requireCustomerApi} from './customer-auth';
export type MarketingAccess={status:string;expires_at:string|null};
export function marketingAccessAllowed(access:MarketingAccess|undefined,now=Date.now()){
 return Boolean(access && ['active','testing'].includes(access.status) && (!access.expires_at || Date.parse(access.expires_at)>now));
}
export async function hasCustomerMarketingAccess(email:string){
 const sql=neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!);
 const rows=await sql`SELECT a.status,a.expires_at FROM customer_marketing_access a JOIN customers c ON c.id=a.customer_id WHERE lower(c.email)=${email.trim().toLowerCase()} AND c.account_status='active'`;
 return marketingAccessAllowed(rows[0] as MarketingAccess|undefined);
}
export async function withMarketingAccess(request:Request,handler:(request:Request)=>Promise<Response>){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 try{
  if(!await hasCustomerMarketingAccess(auth.session.email))return NextResponse.json({error:'The Reviews package is required for marketing tools.',code:'REVIEWS_PACKAGE_REQUIRED',upgradeUrl:'/account/packages'},{status:403,headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Package access is temporarily unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});}
 return handler(request);
}
