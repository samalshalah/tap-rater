import {cache} from 'react';
import {getCustomerPortal} from './customer-portal';
import {hasCustomerMarketingAccess} from './customer-marketing-access';
export const getCustomerExperience=cache(async(email:string)=>{
 const [portal,access]=await Promise.all([getCustomerPortal(email),hasCustomerMarketingAccess(email).then(service=>({service,unavailable:false})).catch(()=>({service:false,unavailable:true}))]);
 const stands=portal.stands.length>0||portal.devices.length>0||portal.subscriptions.length>0;
 const multilink=portal.subscriptions.some(item=>["ACTIVE","REACTIVATED","PAST_DUE","CANCELLED_AT_PERIOD_END"].includes(item.lifecycleStatus)&&(!(item.cancelAtPeriodEnd||item.source==="manual"||item.source==="admin")||!item.currentPeriodEnd||Date.parse(item.currentPeriodEnd)>Date.now()));
 return {multilink,portal,service:access.service,stands,unavailable:access.unavailable};
});
