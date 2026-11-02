import {timingSafeEqual} from 'node:crypto';
import {deliverReviewEmails,enqueueReviewReports} from '@/lib/review-email-delivery';
export async function POST(request:Request){
 const expected=process.env.ADMIN_SESSION_SECRET,received=request.headers.get('x-internal-secret');
 if(!expected||!received||Buffer.byteLength(expected)!==Buffer.byteLength(received)||!timingSafeEqual(Buffer.from(expected),Buffer.from(received)))return new Response(null,{status:401});
 await enqueueReviewReports();
 const result=await deliverReviewEmails();
 return Response.json(result,{status:result.failed?503:200});
}
