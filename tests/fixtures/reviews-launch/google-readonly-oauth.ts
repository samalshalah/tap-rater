import {createServer} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {neon,neonConfig} from '@neondatabase/serverless';
import {beginGoogleConnection,completeGoogleConnection,googleAccessToken} from '../../../src/lib/google-business/connection';
import {createGoogleBusinessClient} from '../../../src/lib/google-business/client';
import {allowedGoogleQaRequest,qaDatabaseHost,norahAccount,norahLocation} from './google-readonly-guard';

async function main(){
 const database=process.env.REVIEWS_JOURNEY_DATABASE_URL;
 if(!database||new URL(database).hostname!==qaDatabaseHost)throw Error('Exact isolated QA database required');
 if(!process.env.GOOGLE_BUSINESS_CLIENT_ID||!process.env.GOOGLE_BUSINESS_CLIENT_SECRET)throw Error('Separate QA OAuth client credentials required');
 if(process.env.GOOGLE_BUSINESS_CLIENT_ID==='130192868056-mnkkhn9jdsmbds8vprbbi6oatplggmpv.apps.googleusercontent.com')throw Error('Production OAuth client forbidden');
 const origin='http://localhost:4184',callback='/api/admin/google-business/callback';
 process.env.DATABASE_URL=database;
 process.env.GOOGLE_BUSINESS_REDIRECT_URI=origin+callback;
 process.env.GOOGLE_BUSINESS_TOKEN_KEY=randomBytes(32).toString('hex');
 process.env.GOOGLE_REVIEWS_PUBLISHING_ENABLED='false';
 const endpoint=neonConfig.fetchEndpoint;
 const api=new URL(typeof endpoint==='function'?endpoint(qaDatabaseHost,5432):endpoint).hostname;
 const network=globalThis.fetch;
 const audit:{method:string;host:string;path:string;status:number}[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
  if(!allowedGoogleQaRequest(url,method,api))throw Error('Read-only QA network guard rejected request');
  if(url.hostname===api){const headers=new Headers(init?.headers);const connection=headers.get('Neon-Connection-String');if(!connection||new URL(connection).hostname!==qaDatabaseHost)throw Error('Non-QA database rejected');}
  const response=await network(input,{...init,redirect:'manual'});
  if(url.hostname!==api)audit.push({method,host:url.hostname,path:url.pathname,status:response.status});
  return response;
 };
 const sql=neon(database),owner='qa:norah-readonly:'+randomUUID(),session=randomBytes(32).toString('hex');
 let busy=false,finished=false;
 const cleanup=async()=>{await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;await sql`DELETE FROM google_business_oauth_attempts WHERE owner=${owner}`;};
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy',req.url==='/'?'same-origin':'no-referrer');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  const page=(text:string)=>res.end(`<!doctype html><title>Tap Rater isolated QA</title><main style="font:18px system-ui;max-width:720px;margin:60px auto"><h1>Norah Boutique — read-only QA</h1>${text}</main>`);
  try{
   if(req.headers.host!=='localhost:4184'){res.statusCode=403;return page('Invalid host.');}
   const url=new URL(req.url||'/',origin);
   if(req.method==='GET'&&url.pathname==='/'){
    res.setHeader('Set-Cookie',`norah_qa=${session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=1800`);
    return page('<p>Isolated QA database. Only Norah Boutique review reads are allowed. No production account changes or reply posting.</p><form action="/start" method="post"><button>Authorize Google for this test</button></form>');
   }
   if(!(req.headers.cookie||'').split('; ').includes('norah_qa='+session)){res.statusCode=403;return page('Open the local test start page first.');}
   if(req.method==='POST'&&url.pathname==='/start'&&req.headers.origin===origin&&!busy&&!finished){
    const target=await beginGoogleConnection(owner,session);res.writeHead(303,{Location:target});return res.end();
   }
   if(req.method==='GET'&&url.pathname===callback&&!busy&&!finished){
    if(url.searchParams.has('error')){res.statusCode=400;return page('Google authorization was not completed. Return to the start page to retry.');}
    busy=true;
    try{
     await completeGoogleConnection(owner,session,url.searchParams.get('state')||'',url.searchParams.get('code')||'');
     const client=createGoogleBusinessClient(await googleAccessToken(owner));
     let token:string|undefined,found:any,pages=0;
     do{const result=await client.listLocations(norahAccount,token);found=result.locations.find(l=>l.name===norahLocation);token=result.nextPageToken;if(++pages>100)throw Error('Location pagination limit');}while(!found&&token);
     if(!found||found.title!=='Norah Boutique')throw Error('Selected location identity mismatch');
     const reviews:any[]=[];let reviewPages=0;
     do{const result=await client.listReviews(norahAccount+'/'+norahLocation,token=reviewPages?token:undefined);reviews.push(...result.reviews.map(({reviewer,...review})=>review));token=result.nextPageToken;if(++reviewPages>100)throw Error('Review pagination limit');}while(token);
     mkdirSync('.local-sandbox',{recursive:true});
     writeFileSync('.local-sandbox/readonly-location.json',JSON.stringify({business_name:found.title,address:found.storefrontAddress,source:'fresh Google OAuth and live API',fetched_at:new Date().toISOString(),reviews}));
     writeFileSync('.local-sandbox/google-live-readonly-result.json',JSON.stringify({location:found.title,reviews:reviews.length,reviewPages,audit,productionWrites:0,googleWrites:0},null,2));
     finished=true;
     return page(`<p>Fresh Google authorization and live read completed.</p><p>${reviews.length} reviews fetched in ${reviewPages} page(s). No replies posted. Production was not connected to this test.</p><p>The isolated import checks can now run.</p>`);
    }finally{await cleanup();busy=false;}
   }
   console.error('QA request rejected:',{method:req.method,path:url.pathname,origin:req.headers.origin,busy,finished});
   res.statusCode=404;page('No action available.');
  }catch(error){console.error('QA step failed:',error instanceof Error?error.message:'Unknown error');res.statusCode=500;page('QA check failed. No Google write was permitted. See the sanitized local test output.');}
 });
 server.listen(4184,'127.0.0.1',()=>console.log('Read-only OAuth runner ready at '+origin));
 const stop=()=>{server.close();cleanup().finally(()=>process.exit());};process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
main().catch(error=>{console.error(error instanceof Error?error.message:'QA startup failed');process.exitCode=1;});
