import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '@/lib/customer-auth';
import {saveStandAssignment} from '@/lib/customer-stand-registry';
const input=z.object({businessId:z.string().uuid().nullable(),label:z.string().trim().max(80),version:z.number().int().nonnegative().max(2147483646)}).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request.'},{status:403});
 const {id}=await params;const value=input.safeParse(await request.json().catch(()=>null));if(!z.string().uuid().safeParse(id).success||!value.success)return NextResponse.json({error:'Check the business and stand label.'},{status:400});
 try{const saved=await saveStandAssignment(auth.session.email,id,value.data.businessId,value.data.label,value.data.version);if(!saved)return NextResponse.json({error:'This stand changed or the business is unavailable. Refresh and try again.'},{status:409});return NextResponse.json({saved:true,version:saved.assignment_version},{headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'The assignment draft could not be saved.'},{status:503});}
}
