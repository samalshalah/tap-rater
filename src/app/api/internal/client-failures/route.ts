import {timingSafeEqual} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {parseSessionToken} from '@/lib/session-token';
import {recordClientFailure,sendClientFailureAlerts,collectBackgroundFailures} from '@/lib/client-failures';
export async function POST(request:Request){
 const expected=process.env.ADMIN_SESSION_SECRET,received=request.headers.get('x-internal-secret');
 if(!expected||!received||Buffer.byteLength(expected)!==Buffer.byteLength(received)||!timingSafeEqual(Buffer.from(expected),Buffer.from(received)))return Response.json({error:'Unauthorized'},{status:401});
 const body=await request.json();
 if(body.action==='drain')return Response.json({...await collectBackgroundFailures(),...await sendClientFailureAlerts()});
 const cookie=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('taprater_customer='))?.slice('taprater_customer='.length);
 const session=parseSessionToken(cookie,'customer-session',process.env.CUSTOMER_SESSION_SECRET,30*24*60*60*1000);
 const sql=neon(process.env.DATABASE_URL!);
 const [customer]=session?await sql`SELECT id FROM customers WHERE lower(email)=${session.email} AND account_status='active' AND (sessions_invalid_before IS NULL OR sessions_invalid_before<${new Date(session.issuedAt).toISOString()}::timestamptz)`:[];
 if(!customer&&Number(body.status)<500)return Response.json({ignored:true});
 const [business]=customer&&typeof body.businessId==='string'&&/^[0-9a-f-]{36}$/i.test(body.businessId)?await sql`SELECT id FROM businesses WHERE id=${body.businessId} AND customer_id=${customer.id}`:[];
 await recordClientFailure({customerId:customer?.id,businessId:business?.id,source:'request',path:String(body.path),code:'http_'+Number(body.status),status:Number(body.status)},sql);
 return Response.json({recorded:true});
}
