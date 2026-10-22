import {withMarketingAccess} from '@/lib/customer-marketing-access';
import {handleHeatmap} from '@/lib/heatmap-http';
const marketingGET=(request:Request)=>handleHeatmap(request,'customer');
const marketingPOST=marketingGET;

export const GET=(request:Request)=>withMarketingAccess(request,()=>marketingGET(request));

export const POST=(request:Request)=>withMarketingAccess(request,()=>marketingPOST(request));
