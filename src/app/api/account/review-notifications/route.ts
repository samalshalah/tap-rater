import {requireCustomerApi} from '@/lib/customer-auth';
import {googleSameOrigin} from '@/lib/google-business/http';
import {reviewEmailSettings,saveEmailPrefs} from '@/lib/review-email-preferences';
export async function POST(request:Request){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 if(!googleSameOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403});
 const input=reviewEmailSettings.safeParse(await request.json().catch(()=>null));
 if(!input.success)return Response.json({error:'Check your notification settings.'},{status:400});
 const version=await saveEmailPrefs(auth.session!.email,input.data);
 return version?Response.json({version}):Response.json({error:'Settings changed or the location is unavailable. Reload to try again.'},{status:409});
}
