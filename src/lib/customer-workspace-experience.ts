import {cache} from 'react';
import {getSupabaseAdmin,hasSupabaseAdminConfig} from './db';
import {hasCustomerMarketingAccess} from './customer-marketing-access';
import {customerNavigationLocations} from './customer-navigation-locations';
import {normalizeCustomer,normalizeSubscription,readRecord,readString} from './customer-portal-normalizers';
import type {CustomerPortalDbClient} from './customer-portal';

export async function customerPurchaseSummary(client:CustomerPortalDbClient,email:string){
 const {data,error}=await client.from('customers').select('id,email').eq('email',email.trim().toLowerCase()).maybeSingle();
 const customer=normalizeCustomer(data);
 if(error||!customer)return {stands:false,multilink:false};
 const [devices,orders,subscriptions]=await Promise.all([
  client.from('devices').select('id,device_code').eq('customer_id',customer.id),
  client.from('orders').select('id,stripe_checkout_session_id,line_items_json').eq('email',customer.email),
  client.from('hosted_subscriptions').select('id,hosted_page_url,permanent_code,lifecycle_status,current_period_end,cancel_at_period_end,stripe_subscription_id').eq('customer_id',customer.id),
 ]);
 const normalized=(subscriptions.data||[]).map(normalizeSubscription).filter(Boolean);
 // Match the portal's valid device/order-item rules without constructing stand cards.
 const stands=normalized.length>0||(devices.data||[]).some((row:unknown)=>{const r=readRecord(row);return readString(r.id)&&readString(r.device_code);})||
  (orders.data||[]).some((row:unknown)=>{const r=readRecord(row);return readString(r.id)&&readString(r.stripe_checkout_session_id)&&Array.isArray(r.line_items_json)&&r.line_items_json.some(item=>readString(readRecord(item).title));});
 const multilink=normalized.some((item:NonNullable<ReturnType<typeof normalizeSubscription>>)=>['ACTIVE','REACTIVATED','PAST_DUE','CANCELLED_AT_PERIOD_END'].includes(item.lifecycleStatus)&&(!(item.cancelAtPeriodEnd||item.source==='manual'||item.source==='admin')||!item.currentPeriodEnd||Date.parse(item.currentPeriodEnd)>Date.now()));
 return {stands:Boolean(stands),multilink};
}

// Render-scoped only: permissions and purchases are checked anew on each request.
export const getCustomerWorkspaceExperience=cache(async(email:string)=>{
 const configured=hasSupabaseAdminConfig();
 const purchases=configured?Promise.resolve().then(()=>customerPurchaseSummary(getSupabaseAdmin(),email)).catch(()=>({stands:false,multilink:false})):Promise.resolve({stands:false,multilink:false});
 const access=hasCustomerMarketingAccess(email).then(service=>({service,unavailable:false})).catch(()=>({service:false,unavailable:true}));
 // Navigation locations need service access, but never need invoices or tap history.
 const navigation=access.then(async({service})=>{
  if(!service)return {locations:[],locationsError:false};
  try{return {locations:await customerNavigationLocations(email),locationsError:false};}
  catch{return {locations:[],locationsError:true};}
 });
 const [summary,permissions,locations]=await Promise.all([purchases,access,navigation]);
 return {...summary,...permissions,...locations,configured};
});
