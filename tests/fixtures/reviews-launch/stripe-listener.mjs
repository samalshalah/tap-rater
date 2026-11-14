import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,rmSync} from 'node:fs';
import Stripe from 'stripe';
if(!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw Error('Sandbox key required');
if((await new Stripe(process.env.STRIPE_SECRET_KEY).accounts.retrieve(null)).id!=='acct_1U1TpVJEgI4VUlPP')throw Error('Tap Rater sandbox required');
mkdirSync('.local-sandbox',{recursive:true});
rmSync('.local-sandbox/reviews-webhook-secret',{force:true});
const child=spawn('npx --yes @stripe/cli listen --forward-to http://127.0.0.1:4183/webhook --events checkout.session.completed,checkout.session.async_payment_succeeded,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed',{shell:true,env:{...process.env,STRIPE_API_KEY:process.env.STRIPE_SECRET_KEY}});
for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{
 const value=data.toString(),secret=value.match(/whsec_[A-Za-z0-9]+/)?.[0];
 if(secret){writeFileSync('.local-sandbox/reviews-webhook-secret',secret);console.log('Sandbox webhook listener ready; secret saved locally.');}
 else console.log(value.replace(/(?:sk|pk|rk)_test_[A-Za-z0-9]+/g,'[redacted]'));
});
child.on('exit',code=>process.exitCode=code??1);
