import {describe,it,expect} from 'vitest';
import {neon} from '@neondatabase/serverless';
import {adminWorkerHealth} from '@/lib/admin-worker-health';
import {observeWorker} from '@/lib/worker-observation';
const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL;
describe.skipIf(!url)('worker health on isolated staging',()=>{
 it('loads the complete read-only health view and records synthetic worker results',async()=>{
  if(!new URL(url!).hostname.includes('ep-lively-star-at7d9rqv'))throw Error('Only isolated staging is allowed');
  const sql=neon(url!);
  await observeWorker('health-test',async()=>({drafted:0}),sql);
  try {
   const data=await adminWorkerHealth(sql);
   expect(data.workers).toHaveLength(6);
   expect(data.accounts.length).toBeGreaterThan(0);
   expect(JSON.stringify(data)).not.toMatch(/access_ciphertext|refresh_ciphertext|attempted_reply|"reviewReply"/);
   for(const l of data.locations)expect(data.accounts.some(a=>a.id===l.customer_id)).toBe(true);
  }finally{await sql`DELETE FROM system_worker_health WHERE name='health-test'`;}
 },30000);
});
