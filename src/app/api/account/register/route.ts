import {NextResponse} from 'next/server';
import {z} from 'zod';
import {liveDb} from '@/lib/google-business/live-reviews';
import {createCustomerActivationToken} from '@/lib/customer-account';
import {sendCustomerActivationEmail} from '@/lib/hosted-setup-email';
import {checkLoginRateLimit,recordLoginAttempt} from '@/lib/auth-rate-limit';
import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
export async function POST(request:Request){
 if(!marketingCheckoutEnabled())return NextResponse.json({error:'Registration is not available yet.'},{status:503});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try{
  const raw=await request.text();if(raw.length>2000)throw Error();
  const {email,name}=z.object({email:z.string().email().max(254).transform(s=>s.toLowerCase()),name:z.string().trim().min(1).max(150)}).strict().parse(JSON.parse(raw));
  const limit=await checkLoginRateLimit({headers:request.headers,identifier:email,scope:'customer_recovery'});
  if(!limit.context.configured)return NextResponse.json({error:'Registration is temporarily unavailable.'},{status:503});
  if(limit.limited)return NextResponse.json({error:'Please wait before requesting another activation email.'},{status:429});
  await recordLoginAttempt(limit.context,false);
  const token=createCustomerActivationToken();
  const rows=await liveDb()`INSERT INTO customers(email,name,account_status,activation_token_hash,activation_expires_at) VALUES(${email},${name},'pending_activation',${token.tokenHash},now()+interval '7 days') ON CONFLICT(email) DO UPDATE SET activation_token_hash=EXCLUDED.activation_token_hash,activation_expires_at=EXCLUDED.activation_expires_at WHERE customers.account_status='pending_activation' RETURNING id`;
  if(rows.length){
   const delivery=await sendCustomerActivationEmail({to:email,activationToken:token.token,customerId:String(rows[0].id)});
   if(!delivery.sent)return NextResponse.json({error:'We could not send your activation email. Please try again shortly or contact support.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
  return NextResponse.json({sent:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Could not start registration. Check your details and try again.'},{status:400});}
}
