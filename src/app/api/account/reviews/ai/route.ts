import {withMarketingAccess} from '@/lib/customer-marketing-access';
import {handleReviewAi} from "@/lib/review-ai-http";
async function marketingPOST(request:Request){return handleReviewAi(request,"customer");}

export const POST=(request:Request)=>withMarketingAccess(request,()=>marketingPOST(request));
