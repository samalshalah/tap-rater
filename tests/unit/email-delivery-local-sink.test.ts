import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildCustomerActivationEmailHtml} from '@/lib/hosted-setup-email';
import {afterEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({apply:vi.fn().mockResolvedValue({ok:true,matched:true})}));
vi.mock('@/lib/email-deliveries',async original=>({...await original<object>(),applyResendWebhookEvent:state.apply}));
import {POST} from '@/app/api/webhooks/resend/route';
import {sendEmail} from '@/lib/email';
import {sendMultiLinkOrderEmailTest} from '@/lib/order-email-test';
import {defaultEmailTemplates} from '@/lib/email-template-config';
afterEach(()=>{vi.unstubAllEnvs();state.apply.mockClear();});
it('passes the actual labeled order template into a local provider sink',async()=>{
 for(const key of ['DATABASE_URL','NEON_DATABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'])vi.stubEnv(key,'');
 vi.stubEnv('RESEND_API_KEY','re_local_sink');const send=vi.fn().mockResolvedValue({data:{id:'local-sink-only'},error:null});
 const result=await sendMultiLinkOrderEmailTest({to:'orders@taprater.com',template:defaultEmailTemplates['customer-order-confirmation'],sendEmailFn:input=>sendEmail({...input,resendClient:{emails:{send}}})});
 expect(result.sent).toBe(true);expect(send).toHaveBeenCalledOnce();
 const payload=send.mock.calls[0][0];expect(payload.to).toBe('orders@taprater.com');expect(payload.subject).toContain('[Test Multi-Link]');expect(payload.html).toContain('TEST EMAIL ONLY');expect(payload.html).toContain('Do not fulfill');
 if(process.env.EMAIL_RENDER_QA==='1'){
  const branch=process.cwd().replaceAll('\\','/').split('/').at(-1)!;
  const dir=resolve('../artifacts/sales-readiness/2026-11-16/sandbox/email-previews');mkdirSync(dir,{recursive:true});
  const localLinks=(html:string)=>html.replaceAll('https://taprater.com','https://localhost:3000');
  writeFileSync(resolve(dir,branch+'-order.html'),localLinks(payload.html));
  const activation=buildCustomerActivationEmailHtml({activationUrl:'https://localhost:3000/account/activate?token=QA-NONFUNCTIONAL',...(branch==='checkout-tracking'?{reviews:true}:{})});
  writeFileSync(resolve(dir,branch+'-activation.html'),localLinks(activation));
 }

});
it('verifies a real Svix HMAC signature before applying delivered status and rejects tampering',async()=>{
 const key=randomBytes(32);vi.stubEnv('RESEND_API_KEY','re_local_sink');vi.stubEnv('RESEND_WEBHOOK_SECRET','whsec_'+key.toString('base64'));
 const id='msg_'+randomUUID(),timestamp=String(Math.floor(Date.now()/1000));
 const body=JSON.stringify({type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:'local-sink-only',to:['orders@taprater.com']}});
 const signature='v1,'+createHmac('sha256',key).update(id+'.'+timestamp+'.'+body).digest('base64');
 const request=(raw:string)=>new Request('http://localhost/api/webhooks/resend',{method:'POST',headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':signature},body:raw});
 expect((await POST(request(body))).status).toBe(200);expect(state.apply).toHaveBeenCalledOnce();
 expect((await POST(request(body+' '))).status).toBe(400);expect(state.apply).toHaveBeenCalledOnce();
});
