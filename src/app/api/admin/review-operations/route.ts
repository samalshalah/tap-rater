import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {updateReviewReplyDelay} from '@/lib/google-business/live-reviews';

const input=z.object({businessId:z.string().uuid(),delayMinutes:z.union([z.literal(5),z.literal(20),z.literal(60),z.literal(120),z.literal(360),z.literal(1440)])}).strict();

export async function POST(request:Request){
 const denied=await requireAdminApi();if(denied)return denied;
 const origin=request.headers.get('origin');
 const expected=process.env.NODE_ENV==='development'?new URL(request.url).origin:new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://taprater.com').origin;
 if(origin!==expected)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try{
  const raw=await request.text();if(raw.length>2000)return NextResponse.json({error:'Request too large.'},{status:413});
  const parsed=input.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Choose a valid reply delay.'},{status:400});
  const result=await updateReviewReplyDelay({kind:'admin'},parsed.data.businessId,parsed.data.delayMinutes);
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const message=error instanceof SyntaxError?'Invalid request.':error instanceof Error?error.message:'Reply timing could not be updated.';
  return NextResponse.json({error:message},{status:400});
 }
}
