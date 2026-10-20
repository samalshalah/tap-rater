import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {runLiveReviewMaintenance} from '@/lib/google-business/live-reviews';
export async function POST(request:Request){
 const expected=process.env.ADMIN_SESSION_SECRET,received=request.headers.get('x-internal-secret');
 if(!expected||!received||Buffer.byteLength(expected)!==Buffer.byteLength(received)||!timingSafeEqual(Buffer.from(expected),Buffer.from(received)))return NextResponse.json({error:'Unauthorized'},{status:401});
 return NextResponse.json(await runLiveReviewMaintenance());
}
