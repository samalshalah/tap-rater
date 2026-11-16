import {randomUUID,createHash} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {neon} from '@neondatabase/serverless';
import {Resend} from 'resend';
import {it,expect} from 'vitest';
import {sendMultiLinkOrderEmailTest} from '@/lib/order-email-test';
import {defaultEmailTemplates} from '@/lib/email-template-config';
import {sendEmail} from '@/lib/email';
it.skipIf(process.env.EMAIL_PROVIDER_SANDBOX_TEST!=='1')('sends a labeled synthetic order email only to the explicitly approved inbox',async()=>{
 const url=process.env.REVIEWS_JOURNEY_DATABASE_URL!,to=process.env.EMAIL_TEST_TO!,from=process.env.EMAIL_TEST_FROM!;
 if(new URL(url).hostname!=='ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech'||!process.env.RESEND_API_KEY||to!=='orders@taprater.com'||to!==process.env.EMAIL_APPROVED_RECIPIENT||!from||from!==process.env.EMAIL_APPROVED_SENDER)throw Error('Explicit approved inbox/sender and isolated QA configuration required');
 Object.assign(process.env,{DATABASE_URL:url,NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''});
 const id=randomUUID(),sql=neon(url),provider=new Resend(process.env.RESEND_API_KEY);
 const branch=process.cwd().replaceAll('\\','/').split('/').at(-1)!;
 const dir=resolve('../artifacts/sales-readiness/2026-11-16/sandbox');mkdirSync(dir,{recursive:true});
 const evidence:any={branch,runId:id,recipientSha256:createHash('sha256').update(to).digest('hex'),providerAcceptance:false,providerDelivery:false,inboxObserved:false,syntheticOnly:true};
 const save=()=>writeFileSync(resolve(dir,branch+'-email-provider.json'),JSON.stringify(evidence,null,2));
 const result=await sendMultiLinkOrderEmailTest({to,template:defaultEmailTemplates['customer-order-confirmation'],sendEmailFn:input=>sendEmail({...input,from,replyTo:to,delivery:{...input.delivery!,entityId:id,idempotencyKey:'email-provider-qa/'+id}})});
 evidence.providerAcceptance=result.sent;save();expect(result.sent).toBe(true);
 const [row]=await sql`SELECT id,provider_message_id,status FROM email_deliveries WHERE entity_id=${id} AND recipient=${to}`;
 expect(row?.provider_message_id).toBeTruthy();evidence.ledgerId=row.id;evidence.providerMessageId=row.provider_message_id;save();
 const deadline=Date.now()+60000;
 while(Date.now()<deadline){
  const response=await provider.emails.get(row.provider_message_id);
  if(response.error){evidence.providerStatusRead='unavailable';save();break;}
  evidence.lastProviderEvent=response.data?.last_event;
  if(['delivered','opened','clicked'].includes(String(response.data?.last_event))){evidence.providerDelivery=true;save();break;}
  if(['bounced','failed','suppressed','complained'].includes(String(response.data?.last_event))){save();break;}
  save();await new Promise(r=>setTimeout(r,3000));
 }
 save();
 // Keep only this synthetic metadata record for reconciliation; no customer/order was created.
},90000);
