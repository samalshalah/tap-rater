// Read-only HTTP benchmark; browser readiness and payment completion are separate checks.
// Usage: node scripts/benchmark-public-page.mjs https://taprater.com/checkout 7
import {performance} from 'node:perf_hooks';
const target=new URL(process.argv[2]||'http://localhost:3000/checkout');
if(!['http:','https:'].includes(target.protocol)||target.username||target.password)throw Error('Use an HTTP(S) URL without credentials.');
const samples=Number(process.argv[3]||7);
if(!Number.isInteger(samples)||samples<1||samples>30)throw Error('Samples must be between 1 and 30.');
const results=[];
for(let i=0;i<samples;i++){
 const start=performance.now();const response=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(30000)});const headersMs=performance.now()-start;
 const bytes=(await response.arrayBuffer()).byteLength;
 results.push({status:response.status,headersMs:Math.round(headersMs),bodyMs:Math.round(performance.now()-start),decodedBytes:bytes});
 if(response.status!==200)throw Error(`Expected a public 200 page; received ${response.status}.`);
}
const median=key=>results.map(r=>r[key]).sort((a,b)=>a-b)[Math.floor(results.length/2)];
console.log(JSON.stringify({url:target.origin+target.pathname,checkedAt:new Date().toISOString(),method:'Sequential GETs; first sample retained. Includes network, excludes JS rendering and payment submission.',samples:results,medianHeadersMs:median('headersMs'),medianBodyMs:median('bodyMs')},null,2));
