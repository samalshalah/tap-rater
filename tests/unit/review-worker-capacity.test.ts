import {it,expect,vi} from 'vitest';
import {runLiveReviewMaintenance} from '@/lib/google-business/live-reviews';

it('drains 1000 due locations fairly in bounded batches with at most four concurrent imports',async()=>{
 const pending=Array.from({length:1000},(_,i)=>String(i)),seen=new Set<string>();let active=0,maximum=0;
 const sql=vi.fn(async(strings:TemplateStringsArray,...values:unknown[])=>{
  const q=strings.join('?');
  if(q.includes('UPDATE google_review_worker_lease')&&q.includes('RETURNING'))return [{id:1}];
  if(q.includes('RETURNING l.business_id,l.profile_ai_enabled'))return pending.splice(0,80).map(business_id=>({business_id}));
  if(q.includes('SELECT l.*'))return [{business_id:values[0],owner:values[0],parent:values[0],enabled:true,ai_consent:false}];
  if(q.includes('SET sync_lock='))return [{business_id:values[1]}];
  return [];
 });
 const google=async(owner:string)=>({listReviews:async()=>{expect(seen.has(owner)).toBe(false);seen.add(owner);active++;maximum=Math.max(maximum,active);await new Promise(r=>setTimeout(r,1));active--;return {reviews:[]};}} as any);
 const ai=vi.fn();let total=0;
 for(let cycle=0;cycle<13;cycle++){const result=await runLiveReviewMaintenance(sql as any,google,ai);expect(result.synced).toBeLessThanOrEqual(80);total+=result.synced;expect(result.published).toBe(0);}
 expect(total).toBe(1000);expect(seen.size).toBe(1000);expect(maximum).toBe(4);expect(ai).not.toHaveBeenCalled();
});
