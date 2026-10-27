import {AsyncLocalStorage} from 'node:async_hooks';

type Entry={name:string;durationMs:number;calls:number};
type Scope={entries:Map<string,Entry>;values:Map<string,Promise<unknown>>;enabled:boolean};
const scopes=new AsyncLocalStorage<Scope>();

export async function measureServerStage<T>(name:string,work:()=>PromiseLike<T>|T):Promise<T>{
 const scope=scopes.getStore();
 if(!scope?.enabled)return await work();
 // Labels are code-defined categories, never SQL, URLs, customer identifiers or payloads.
 if(!/^[a-z_]{1,64}$/.test(name))return await work();
 const start=performance.now();
 try{return await work();}finally{
  const entry=scope.entries.get(name)||{name,durationMs:0,calls:0};
  entry.durationMs+=performance.now()-start;entry.calls++;scope.entries.set(name,entry);
 }
}

/** Reuse only within a wrapped GET. No cross-request/session cache. */
export function requestRead<T>(key:string,work:()=>Promise<T>):Promise<T>{
 const scope=scopes.getStore();if(!scope)return work();
 let value=scope.values.get(key) as Promise<T>|undefined;
 if(!value){value=Promise.resolve().then(work);scope.values.set(key,value);}
 return value;
}

export async function withServerTiming(request:Request|undefined,work:()=>Promise<Response>):Promise<Response>{
 if(!request||request.method!=='GET')return work();
 const enabled=new URL(request.url).searchParams.get('timing')==='1';
 return scopes.run({entries:new Map(),values:new Map(),enabled},async()=>{
  const response=await measureServerStage('total',work);
  if(!enabled||response.status!==200)return response;
  const body=await response.clone().json().catch(()=>null);
  // Never decorate anonymous session responses or non-object payloads.
  if(!body||Array.isArray(body)||body.authenticated===false)return response;
  const timings=[...scopes.getStore()!.entries.values()].map(e=>({...e,durationMs:Math.round(e.durationMs*10)/10}));
  const headers=new Headers(response.headers);headers.delete('content-length');headers.set('Cache-Control','private, no-store');
  headers.set('Server-Timing',timings.map(e=>`${e.name};dur=${e.durationMs}`).join(', '));
  return Response.json({...body,serverTiming:timings},{status:response.status,headers});
 });
}
