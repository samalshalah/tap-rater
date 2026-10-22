import {cookies} from 'next/headers';
import {customerCookieName,requireCustomerApi} from '../customer-auth';
export const customerFlowCookie='taprater_google_customer_flow';
export async function googleCustomerIdentity(){
 const auth=await requireCustomerApi();
 if(auth.response || !auth.session)return null;
 const session=(await cookies()).get(customerCookieName)?.value;
 if(!session)return null;
 return {owner:'customer:'+auth.session.email.trim().toLowerCase(),email:auth.session.email.trim().toLowerCase(),session};
}
