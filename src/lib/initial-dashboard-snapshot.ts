import type {Snapshot} from '@/components/account/local-dashboard-types';
import {getCustomerMarketingState} from './customer-marketing-access';
import {localSnapshot} from './local-management';

// Called only after requireCustomer. Never share a workspace across requests.
export async function getInitialDashboardSnapshot(email:string):Promise<Snapshot|null>{
 try{
  const access=await getCustomerMarketingState(email);
  if(!access.allowed||!access.onboardingCompleted)return null;
  const snapshot=await localSnapshot({kind:'customer',email});
  // Match the API's JSON representation, including database date values.
  return JSON.parse(JSON.stringify(snapshot)) as Snapshot;
 }catch{
  // Preserve the existing client fetch, error message and retry on read failure.
  return null;
 }
}
