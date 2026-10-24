import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '@/lib/customer-auth';
import {getSupabaseAdmin} from '@/lib/db';
const schema=z.object({name:z.string().trim().min(1).max(120),phone:z.string().trim().max(40)}).strict();
export async function POST(request:Request){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request.'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Enter a name and a valid contact number.'},{status:400});
 const {data,error}=await getSupabaseAdmin().from('customers').update({...parsed.data,updated_at:new Date().toISOString()}).eq('email',auth.session.email).eq('account_status','active').select('id').maybeSingle();
 if(error||!data)return NextResponse.json({error:'Your details could not be saved. Please try again.'},{status:503});
 return NextResponse.json({saved:true},{headers:{'Cache-Control':'private, no-store'}});
}
