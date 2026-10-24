import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '@/lib/customer-auth';
import {accountBusinesses,businessDraftInput,saveAccountBusinessDraft} from '@/lib/account-business-drafts';
const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
type Context={params:Promise<{id:string}>};
async function handle(request:Request,context:Context,save:boolean){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 if(save&&request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request.'},{status:403,headers});
 const {id}=await context.params;if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Business not found.'},{status:404,headers});
 try{
  if(!save){const [business]=await accountBusinesses(auth.session.email,id);return business?NextResponse.json(business,{headers}):NextResponse.json({error:'Business not found.'},{status:404,headers});}
  const raw=await request.text();if(raw.length>16000)return NextResponse.json({error:'The draft is too large.'},{status:413,headers});
  let value;try{value=JSON.parse(raw);}catch{return NextResponse.json({error:'Check your business details.'},{status:400,headers});}
  const parsed=businessDraftInput.safeParse(value);if(!parsed.success)return NextResponse.json({error:'Enter a business name and a valid website URL, or leave the website blank.'},{status:400,headers});
  const result=await saveAccountBusinessDraft(auth.session.email,id,parsed.data);
  return result?NextResponse.json(result,{headers}):NextResponse.json({error:'This business changed or is no longer available. Close and reopen the editor before saving.'},{status:409,headers});
 }catch{return NextResponse.json({error:'Business drafts are temporarily unavailable. Please try again.'},{status:503,headers});}
}
export const GET=(request:Request,context:Context)=>handle(request,context,false);
export const POST=(request:Request,context:Context)=>handle(request,context,true);
