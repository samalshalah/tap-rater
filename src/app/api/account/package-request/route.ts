import {NextResponse} from 'next/server';
import {neon} from '@neondatabase/serverless';
import {requireCustomerApi} from '@/lib/customer-auth';
import {googleSameOrigin} from '@/lib/google-business/http';
export async function POST(request:Request){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 if(!googleSameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try{const sql=neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!);
 await sql`INSERT INTO customer_marketing_requests(customer_id) SELECT id FROM customers WHERE lower(email)=${auth.session.email.toLowerCase()} AND account_status='active' ON CONFLICT(customer_id) DO NOTHING`;
 return NextResponse.json({requested:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Could not save your request. Please try again.'},{status:503});}
}
