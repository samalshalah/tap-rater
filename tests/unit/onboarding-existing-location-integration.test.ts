import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {it,expect,vi,afterEach} from 'vitest';
const identity=vi.hoisted(()=>({email:''}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:async()=>({session:{email:identity.email},response:null})}));
import {GET,POST} from '@/app/api/account/onboarding/route';
import {bindGoogleLocation} from '@/lib/google-business/live-reviews';

const url=process.env.REVIEWS_JOURNEY_DATABASE_URL;
const qaHost='ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it.skipIf(!url)('executes existing-location onboarding with real QA SQL, ownership, limits and preserved destinations',async()=>{
 if(new URL(url!).hostname!==qaHost)throw Error('Dedicated Reviews launch QA branch required');
 const originalFetch=globalThis.fetch;
 vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const target=new URL(input instanceof Request?input.url:String(input));
  const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
  if(target.protocol!=='https:'||target.hostname!=='api.c-9.us-east-1.aws.neon.tech'||target.pathname!=='/sql'||headers.get('Neon-Connection-String')!==url)throw Error('External network blocked in onboarding QA');
  return originalFetch(input,init);
 });
 vi.stubEnv('DATABASE_URL',url!);vi.stubEnv('NEON_DATABASE_URL','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','false');
 const sql=neon(url!),customer=randomUUID(),stranger=randomUUID(),owned=randomUUID(),extra=randomUUID(),removed=randomUUID(),foreign=randomUUID();
 const email=`onboarding-owner-${customer}@example.test`,foreignEmail=`onboarding-other-${stranger}@example.test`,owner=`customer:${email}:location:${owned}`;
 const endpoint='https://taprater.com/api/account/onboarding';
 const choose=(businessId:string)=>POST(new Request(endpoint,{method:'POST',headers:{origin:'https://taprater.com'},body:JSON.stringify({action:'chooseExisting',businessId})}));
 identity.email=email;
 try{
  await sql`INSERT INTO customers(id,email,account_status) VALUES(${customer},${email},'active'),(${stranger},${foreignEmail},'active')`;
  await sql`INSERT INTO customer_marketing_access(customer_id,status,source,location_limit,ai_monthly_limit) VALUES(${customer},'testing','testing',1,10),(${stranger},'testing','testing',1,10)`;
  await sql`INSERT INTO businesses(id,customer_id,business_name,address,status,google_place_id,google_review_url) VALUES(${owned},${customer},'Existing stand business','QA only','active','qa-place','https://search.google.com/local/writereview?placeid=qa-place'),(${extra},${customer},'Extra owned location','QA only','active',NULL,NULL),(${removed},${customer},'Removed service location','QA only','marketing_removed',NULL,NULL),(${foreign},${stranger},'Other tenant','QA only','active',NULL,NULL)`;
  const snapshot=await GET(new Request(endpoint));expect(snapshot.status).toBe(200);
  expect((await snapshot.json()).businesses.map((b:{id:string})=>b.id).sort()).toEqual([owned,extra].sort());
  expect((await choose(foreign)).status).toBe(400);expect((await choose(removed)).status).toBe(400);
  expect(await sql`SELECT business_id FROM marketing_location_access WHERE customer_id IN (${customer},${stranger})`).toHaveLength(0);
  const selected=await choose(owned);expect(selected.status).toBe(200);expect(await selected.json()).toMatchObject({business_id:owned});
  const repeat=await Promise.all([choose(owned),choose(owned)]);expect(repeat.map(r=>r.status)).toEqual([200,200]);
  expect(await sql`SELECT id FROM businesses WHERE customer_id=${customer}`).toHaveLength(3);
  expect(await sql`SELECT business_id FROM marketing_location_access WHERE customer_id=${customer} AND enabled`).toEqual([{business_id:owned}]);
  expect((await choose(extra)).status).toBe(400);
  await sql`UPDATE customers SET marketing_onboarding_business_id=NULL WHERE id=${customer}`;
  expect((await choose(extra)).status).toBe(400); // Existing license already fills the allowance.
  expect((await sql`SELECT marketing_onboarding_business_id FROM customers WHERE id=${customer}`)[0].marketing_onboarding_business_id).toBeNull();
  expect((await choose(owned)).status).toBe(200); // Reusing the same full license remains allowed.
  await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${customer},${email},'test-only','test-only',now()+interval '1 hour','test-only')`;
  const location='locations/'+owned;
  const google={listLocations:vi.fn().mockResolvedValue({locations:[{name:location,title:'Confirmed Google name',storefrontAddress:{addressLines:['QA only']}}]}),listReviews:vi.fn().mockResolvedValue({reviews:[],totalReviewCount:0}),publishReply:vi.fn()};
  await bindGoogleLocation(owner,owned,'accounts/qa',location,sql,vi.fn().mockResolvedValue(google) as any,email);
  expect((await sql`SELECT google_place_id,google_review_url FROM businesses WHERE id=${owned}`)[0]).toEqual({google_place_id:'qa-place',google_review_url:'https://search.google.com/local/writereview?placeid=qa-place'});
  expect(await sql`SELECT business_id FROM marketing_location_access WHERE customer_id=${customer} AND enabled`).toHaveLength(1);
  expect(google.publishReply).not.toHaveBeenCalled();
  const attackerFactory=vi.fn();await expect(bindGoogleLocation(`customer:${foreignEmail}:location:${owned}`,owned,'accounts/qa',location,sql,attackerFactory,foreignEmail)).rejects.toThrow('active customer');expect(attackerFactory).not.toHaveBeenCalled();
  identity.email=foreignEmail;expect((await choose(owned)).status).toBe(400);
  identity.email=email;await sql`UPDATE customer_marketing_access SET expires_at=now()-interval '1 second' WHERE customer_id=${customer}`;
  expect((await choose(owned)).status).toBe(403);
 }finally{
  await sql`DELETE FROM businesses WHERE id IN (${owned},${extra},${removed},${foreign}) AND customer_id IN (${customer},${stranger})`;
  await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;
  await sql`DELETE FROM customers WHERE id IN (${customer},${stranger}) AND email IN (${email},${foreignEmail})`;
  expect(await sql`SELECT id FROM customers WHERE id IN (${customer},${stranger})`).toHaveLength(0);
  expect(await sql`SELECT id FROM businesses WHERE id IN (${owned},${extra},${removed},${foreign})`).toHaveLength(0);
 }
},120000);
