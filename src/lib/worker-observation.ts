import type {NeonQueryFunction} from '@neondatabase/serverless';
export const workerCatalog=[
 {name:'reviews',label:'Reviews & profile AI',minutes:1},
 {name:'analytics',label:'Purchase analytics retry',minutes:15},
 {name:'reminders',label:'Checkout reminders',minutes:15},
 {name:'sample-drafts',label:'Sample review drafts',minutes:15},
 {name:'heatmap',label:'Heat-map scheduler',minutes:15},
 {name:'backup',label:'Media backup',minutes:15},
] as const;
export function workerMetrics(value:unknown){
 const out:Record<string,number|boolean|string>={};
 if(value&&typeof value==='object')for(const key of ['synced','drafted','published','submitted','collected','invalid','objects','bytes','busy','completed','status']){
  const v=(value as Record<string,unknown>)[key];
  if(typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean')out[key]=v;
  if(key==='status'&&typeof v==='string'&&['disabled','idle_or_capped','processed'].includes(v))out[key]=v;
 }
 return out;
}
// Telemetry failure never prevents the actual job; no secrets or payloads are stored.
export async function observeWorker<T>(name:string,work:()=>Promise<T>,sql:NeonQueryFunction<false,false>):Promise<T>{
 const id=crypto.randomUUID();
 const record=async(fn:()=>Promise<unknown>)=>{try{await fn();}catch{console.warn('Worker health recording unavailable');}};
 await record(()=>sql`INSERT INTO system_worker_health(name,run_id,status) VALUES(${name},${id},'running') ON CONFLICT(name) DO UPDATE SET run_id=excluded.run_id,started_at=now(),finished_at=NULL,status='running'`);
 try{
  const result=await work();
  await record(()=>sql`UPDATE system_worker_health SET status='success',finished_at=now(),succeeded_at=now(),failures=0,metrics=${JSON.stringify(workerMetrics(result))}::jsonb WHERE name=${name} AND run_id=${id}`);
  return result;
 }catch(error){
  await record(()=>sql`UPDATE system_worker_health SET status='failed',finished_at=now(),failures=failures+1,metrics='{}' WHERE name=${name} AND run_id=${id}`);
  throw error;
 }
}
