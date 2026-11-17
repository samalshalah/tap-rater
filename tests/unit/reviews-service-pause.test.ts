import {expect,it,vi} from 'vitest';
import {localMutation,mutateLocal} from '@/lib/local-management';
import {assertReviewServiceStillRunning} from '@/lib/google-business/live-review-core';
const id='11111111-1111-4111-8111-111111111111';
it('uses the signed-in customer and optimistic version for pause/resume',async()=>{
 const sql=vi.fn().mockResolvedValue([{business_id:id,service_paused:true,settings_version:8}]);
 await mutateLocal({kind:'customer',email:'QA@example.test'},{action:'setServicePaused',businessId:id,paused:true,version:7},sql as never);
 expect(sql.mock.calls[0].slice(1)).toEqual(['qa@example.test',id,true,7]);
 expect(localMutation.safeParse({action:'setServicePaused',businessId:id,paused:true,version:7,customerId:id}).success).toBe(false);
});
it('rejects unavailable, existing-account, foreign or stale transitions',async()=>{
 const sql=vi.fn().mockResolvedValue([]);
 await expect(mutateLocal({kind:'customer',email:'qa@example.test'},{action:'setServicePaused',businessId:id,paused:false,version:7},sql as never)).rejects.toMatchObject({status:409});
});
it('does not expose the customer control through staff actions',async()=>{
 const sql=vi.fn();
 await expect(mutateLocal({kind:'admin'},{action:'setServicePaused',businessId:id,paused:true,version:7},sql as never)).rejects.toMatchObject({status:403});
 expect(sql).not.toHaveBeenCalled();
});
it('discards manual suggestions completed after pause or changed settings',async()=>{
 const link={reviews_pause_available:true,business_id:id,settings_version:7};
 for(const current of [{enabled:false,service_paused:true,settings_version:8},{enabled:true,service_paused:false,settings_version:9}]){
  await expect(assertReviewServiceStillRunning(link,vi.fn().mockResolvedValue([current]) as never)).rejects.toThrow('paused');
 }
 await expect(assertReviewServiceStillRunning(link,vi.fn().mockResolvedValue([{enabled:true,service_paused:false,settings_version:7}]) as never)).resolves.toBeUndefined();
});
it('leaves legacy reply generation unchanged',async()=>{
 const sql=vi.fn();await assertReviewServiceStillRunning({business_id:id,settings_version:7},sql as never);expect(sql).not.toHaveBeenCalled();
});
