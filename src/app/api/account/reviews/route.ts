import {withMarketingAccess} from '@/lib/customer-marketing-access';
import { handleSampleReply } from "@/lib/review-workspace-http";
async function marketingPOST(request: Request) { return handleSampleReply(request, "customer"); }

export const POST=(request:Request)=>withMarketingAccess(request,()=>marketingPOST(request));
