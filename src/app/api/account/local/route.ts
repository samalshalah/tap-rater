import {withMarketingAccess} from '@/lib/customer-marketing-access';
import {handleLocal} from '@/lib/local-management-http';
const marketingGET=(request:Request)=>handleLocal(request,'customer');
const marketingPOST=(request:Request)=>handleLocal(request,'customer');

export const GET=(request:Request)=>withMarketingAccess(request,()=>marketingGET(request));

export const POST=(request:Request)=>withMarketingAccess(request,()=>marketingPOST(request));
