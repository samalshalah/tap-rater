import {z} from 'zod';
import {neon} from '@neondatabase/serverless';
import {requireCustomerApi} from '@/lib/customer-auth';
import {recordClientFailure} from '@/lib/client-failures';
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 const raw=await request.text();if(raw.length>600)return Response.json({error:'Too large'},{status:400});
 let body;try{body=z.object({kind:z.enum(['page_render','javascript','unhandled_promise','network','operation_failed']),path:z.string().max(250)}).strict().parse(JSON.parse(raw));}catch{return Response.json({error:'Invalid event'},{status:400});}
 const sql=neon(process.env.DATABASE_URL!);const [customer]=await sql`SELECT id FROM customers WHERE lower(email)=${auth.session.email}`;
 if(customer)await recordClientFailure({customerId:customer.id,source:'browser',code:body.kind,path:body.path},sql);
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
