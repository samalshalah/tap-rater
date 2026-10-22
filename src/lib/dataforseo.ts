import {z} from 'zod';
import type {GridSettings,GridPoint} from './heatmap-data';

export const POINT_COST_MICROUSD=600;
// Restrict keyword syntax to ordinary searches; encoded operators can change pricing.
export function rankRequest(settings:GridSettings,point:GridPoint){
 if(!/^[\p{L}\p{N}\s'’&.,-]+$/u.test(settings.keyword))throw new Error('Use a plain search phrase without search operators.');
 return {keyword:settings.keyword,language_code:settings.language,location_coordinate:`${point.latitude},${point.longitude},17z`,depth:20,priority:1,device:'desktop',search_this_area:true};
}
export function scanPeriod(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(key:string)=>parts.find(p=>p.type===key)!.value;
 const day=Number(part('day'));return `${part('year')}-${part('month')}-${String(day>=22?22:day>=15?15:day>=8?8:1).padStart(2,'0')}`;
}
const envelope=z.object({status_code:z.number(),tasks:z.array(z.object({id:z.string().nullable().optional(),status_code:z.number(),cost:z.number().nonnegative().optional(),data:z.object({tag:z.string().optional()}).passthrough().optional(),result:z.unknown().optional()})).nullable()});
export type RankResult={state:'pending'|'complete'|'error';rank?:number|null;count?:number;code?:string};
export function parseRankResult(raw:unknown,id:string,placeId:string):RankResult{
 const parsed=envelope.safeParse(raw);if(!parsed.success||parsed.data.status_code!==20000)return {state:'error',code:'invalid_response'};
 const task=parsed.data.tasks?.find(t=>t.id===id);if(!task)return {state:'error',code:'task_mismatch'};
 if([20100,40601,40602].includes(task.status_code))return {state:'pending'};
 if(task.status_code===40102)return {state:'complete',rank:null,count:0};
 if(task.status_code!==20000)return {state:'error',code:`provider_${task.status_code}`};
 const results=z.array(z.object({items:z.array(z.object({type:z.string(),place_id:z.string().nullable().optional(),rank_group:z.number().int().positive().optional()}))})).min(1).safeParse(task.result);
 if(!results.success)return {state:'error',code:'invalid_result'};
 const organic=results.data[0].items.filter(i=>i.type==='maps_search');
 const match=organic.find(i=>i.place_id===placeId);
 if(match&&(!match.rank_group||match.rank_group>100))return {state:'error',code:'invalid_rank'};
 return {state:'complete',rank:match?.rank_group??null,count:organic.length};
}
export function providerConfigured(){return Boolean(process.env.DATAFORSEO_LOGIN&&process.env.DATAFORSEO_PASSWORD);}
export function createRankProvider(fetcher:typeof fetch=fetch){
 async function request(path:string,body?:unknown){
  if(!providerConfigured())throw new Error('Ranking provider credentials are not configured.');
  const response=await fetcher(`https://api.dataforseo.com/v3/serp/google/maps/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Basic ${Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000),redirect:'error',cache:'no-store'});
  if(!response.ok)throw new Error('Ranking provider request failed.');
  return response.json();
 }
 return {
  // Intentionally no retry: a lost POST response may still represent billable tasks.
  submit:async(points:{id:string;request:unknown}[])=>{
   const raw=envelope.parse(await request('task_post',points.map(p=>({...p.request as object,tag:p.id}))));
   if(raw.status_code!==20000)throw new Error('Ranking provider did not confirm submission.');
   return points.map(p=>{const matches=raw.tasks?.filter(t=>t.data?.tag===p.id)||[];const t=matches.length===1?matches[0]:undefined;return {id:p.id,providerId:t?.id,state:t?.status_code===20100&&t.id?'pending' as const:'uncertain' as const,cost:t?.cost===undefined?undefined:Math.ceil(t.cost*1e6)};});
  },
  collect:async(id:string,placeId:string)=>{if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw new Error('Invalid provider task');return parseRankResult(await request(`task_get/advanced/${id}`),id,placeId);},
 };
}
