import {withMarketingAccess} from '@/lib/customer-marketing-access';
import {handleProfile} from '@/lib/google-business/profile-http';
const marketingGET=(request:Request)=>handleProfile(request,'customer');
const marketingPOST=marketingGET;

export const GET=(request:Request)=>withMarketingAccess(request,()=>marketingGET(request));

export const POST=(request:Request)=>withMarketingAccess(request,()=>marketingPOST(request));
