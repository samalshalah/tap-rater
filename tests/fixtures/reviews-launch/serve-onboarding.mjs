import {createServer} from 'vite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url)),repo=path.resolve(root,'../../..');
const states=JSON.parse(readFileSync(path.join(repo,'.local-sandbox/qa-onboarding-states.json'),'utf8'));
if(!states.finished.completed||!states.importStates.length)throw Error('Run the isolated onboarding integration test first');
let current=states.connected,index=0;
const server=await createServer({root,publicDir:path.join(repo,'public'),resolve:{alias:{'@':path.join(repo,'src'),'next/navigation':path.join(root,'navigation.ts'),'next/link':path.join(root,'link.tsx')}},esbuild:{jsx:'automatic'},css:{postcss:repo},server:{host:'127.0.0.1',port:4183,strictPort:true,fs:{allow:[repo]}},plugins:[{name:'qa-onboarding-replay',configureServer(server){server.middlewares.use('/api/account/onboarding',async(req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(req.method==='POST'){
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000){res.statusCode=413;res.end('{}');return;}}
  try{const body=JSON.parse(raw);if(body.action==='import'){current=states.importStates[Math.min(index++,states.importStates.length-1)];}else if(body.action==='finish'&&current.synced_at&&!current.next_page&&!current.last_error){current=states.finished;}else throw Error();}catch{res.statusCode=400;res.end(JSON.stringify({error:'Invalid QA replay step'}));return;}
 }
 res.end(JSON.stringify(current));
 });}}]});
await server.listen();server.printUrls();
