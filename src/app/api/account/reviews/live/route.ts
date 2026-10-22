import {withMarketingAccess} from '@/lib/customer-marketing-access';
import {handleLiveReviews} from '@/lib/google-business/live-http';
const marketingGET=(request:Request)=>handleLiveReviews(request,'customer');
const marketingPOST=(request:Request)=>handleLiveReviews(request,'customer');

export const GET=(request:Request)=>withMarketingAccess(request,()=>marketingGET(request));

export const POST=(request:Request)=>withMarketingAccess(request,()=>marketingPOST(request));
