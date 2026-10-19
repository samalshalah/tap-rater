import {handleReviewAi} from "@/lib/review-ai-http";
export async function POST(request:Request){return handleReviewAi(request,"customer");}
