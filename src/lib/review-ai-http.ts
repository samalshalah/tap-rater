import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomerApi } from "./customer-auth";
import { googleAdminIdentity } from "./google-business/http";
import type { ReviewActor } from "./review-workspaces";
import { ReviewAiError,autoSettingsSchema,saveAutoSettings,suggestReviewReply,runSampleAutoReplies } from "./review-ai";
const requestSchema=z.discriminatedUnion("action",[
 z.object({action:z.literal("suggest"),id:z.string().uuid()}).strict(),
 z.object({action:z.literal("settings"),settings:autoSettingsSchema}).strict(),
 z.object({action:z.literal("run"),businessId:z.string().uuid()}).strict()
]);
export async function handleReviewAi(request:Request,kind:"customer"|"admin"){
 let actor:ReviewActor;
 if(kind==="admin"){
  if(!await googleAdminIdentity())return NextResponse.json({error:"Sign in to continue."},{status:401});
  actor={kind:"admin"};
 }else{
  const auth=await requireCustomerApi();if(auth.response)return auth.response;
  actor={kind:"customer",email:auth.session.email};
 }
 if(request.headers.get("origin")!==new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com").origin)return NextResponse.json({error:"Invalid request origin."},{status:403});
 const raw=await request.text();
 if(raw.length>5000)return NextResponse.json({error:"Request is too large."},{status:413});
 let input:unknown;try{input=JSON.parse(raw);}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 const parsed=requestSchema.safeParse(input);if(!parsed.success)return NextResponse.json({error:"Check the reply settings and try again."},{status:400});
 try{
  const v=parsed.data;
  const result=v.action==="suggest"?{suggestions:await suggestReviewReply(actor,v.id)}
   :v.action==="settings"?{settings:await saveAutoSettings(actor,v.settings)}:await runSampleAutoReplies(actor,v.businessId);
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof ReviewAiError?error.message:"AI could not complete this request. Your existing reply is unchanged. Please try again later."},{status:error instanceof ReviewAiError?error.status:503});}
}
