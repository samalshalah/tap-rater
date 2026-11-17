import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url)),repo=path.resolve(root,'../../..');
const selection={placeId:'fixture',name:'Cedar Studio',formattedAddress:'12 Market Street, New York',reviewUrl:''};
let preview=null;
const server=await createServer({root,publicDir:path.join(repo,'public'),resolve:{alias:{'@':path.join(repo,'src'),'next/link':path.join(root,'link.tsx')}},esbuild:{jsx:'automatic'},css:{postcss:repo},server:{host:'127.0.0.1',port:4186,strictPort:true,fs:{allow:[repo,path.resolve(repo,'../checkout-tracking/node_modules')]}},plugins:[{name:'preview-qa',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 if(!req.url?.startsWith('/api/')&&!req.url?.startsWith('/qa-'))return next();
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(req.url.startsWith('/qa-connect')){preview.connected=true;preview.googleEmail='qa@example.test';res.statusCode=302;res.setHeader('Location','/preview.html?preview=connected');res.end();return;}
 if(req.url.startsWith('/qa-checkout')){res.setHeader('Content-Type','text/html');res.end('<h1>QA checkout handoff passed</h1><p>Selected business retained. No payment or email was sent.</p>');return;}
 if(req.url.startsWith('/api/setup/google-places')){res.end(JSON.stringify({ok:true,configured:true,results:[selection]}));return;}
 let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};
 if(req.url.startsWith('/api/account/marketing-subscription')){if(!preview?.complete||!body.email||!body.acceptedTerms){res.statusCode=400;res.end('{}');return;}res.end(JSON.stringify({url:'http://127.0.0.1:4186/qa-checkout'}));return;}
 let result;
 switch(body.action){
 case 'start':preview={id:'11111111-1111-4111-8111-111111111111',selection,connected:false,selected:false,complete:false,locked:false,alreadyAssigned:false,analysis:null};break;
 case 'connect':result={url:'http://127.0.0.1:4186/qa-connect'};break;
 case 'accounts':result={accounts:[{name:'accounts/fixture',accountName:'Cedar Studio account'}]};break;
 case 'locations':result={locations:[{name:'locations/fixture',title:selection.name,storefrontAddress:{addressLines:['12 Market Street'],locality:'New York'}}]};break;
 case 'match':
 case 'select':preview={...preview,name:selection.name,address:selection.formattedAddress,selected:true,analysis:{reviewCount:50,total:126,unanswered:0,byStars:[],unknownStars:0}};break;
 case 'analyse':preview={...preview,complete:true,analysis:{reviewCount:126,total:126,average:4.5,unanswered:43,unknownStars:0,byStars:[{stars:1,total:6,unanswered:4},{stars:2,total:4,unanswered:3},{stars:3,total:8,unanswered:5},{stars:4,total:24,unanswered:9},{stars:5,total:84,unanswered:22}]}};break;
 }
 res.end(JSON.stringify(result||{preview}));
 });}}]});await server.listen();server.printUrls();
