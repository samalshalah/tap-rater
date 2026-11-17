import {NextResponse} from 'next/server';
import {requireCustomerApi} from '@/lib/customer-auth';
import {reviewsBillingSnapshot,previewReviewsPlan,confirmReviewsPlan} from '@/lib/reviews-plan-management';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){const auth=await requireCustomerApi();if(auth.response)return auth.response;try{return NextResponse.json(await reviewsBillingSnapshot(auth.session.email),{headers});}catch{return NextResponse.json({error:'Billing details are temporarily unavailable. Please try again.'},{status:503,headers});}}
export async function POST(request:Request){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
 try{const raw=await request.text();if(raw.length>5000)throw Error('Invalid request.');const data=JSON.parse(raw);
  if(data.action==='preview')return NextResponse.json(await previewReviewsPlan(auth.session.email,data.choice),{headers});
  if(data.action==='confirm')return NextResponse.json(await confirmReviewsPlan(auth.session.email,data.request),{headers});
  throw Error('Invalid billing action.');
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not change your plan.'},{status:409,headers});}
}
