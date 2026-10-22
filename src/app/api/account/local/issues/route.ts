import {withMarketingAccess} from '@/lib/customer-marketing-access';
import {handleLocalIssues} from '@/lib/local-issue-http';
const marketingGET=(request:Request)=>handleLocalIssues(request,'customer');
const marketingPOST=marketingGET;

export const GET=(request:Request)=>withMarketingAccess(request,()=>marketingGET(request));

export const POST=(request:Request)=>withMarketingAccess(request,()=>marketingPOST(request));
