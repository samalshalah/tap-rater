import {it,expect,vi} from 'vitest';
import {sendReviewWorkerAlerts,reviewWorkerFailure} from '@/lib/review-worker-alerts';
it('sends operational alerts to configured admin without review content and records delivery',async()=>{
 vi.stubEnv('ADMIN_EMAIL','admin@example.test');
 const sql=vi.fn().mockResolvedValueOnce([{business_id:'location-fixture',stage:'import',failures:3}]).mockResolvedValue([]),send=vi.fn().mockResolvedValue({sent:true});
 await sendReviewWorkerAlerts(sql as any,send);expect(send).toHaveBeenCalledOnce();expect(send.mock.calls[0][0].to).toBe('admin@example.test');expect(send.mock.calls[0][0].html).toContain('/admin/ai-agent');expect(sql.mock.calls[1][0].join('')).toContain('emailed_at=now()');vi.unstubAllEnvs();
});
it('retains failed email deliveries for retry',async()=>{
 vi.stubEnv('ADMIN_EMAIL','admin@example.test');const sql=vi.fn().mockResolvedValue([{business_id:'fixture',stage:'draft',failures:4}]);
 await sendReviewWorkerAlerts(sql as any,vi.fn().mockResolvedValue({sent:false,reason:'temporary'}));expect(sql).toHaveBeenCalledOnce();vi.unstubAllEnvs();
});
it('escalates uncertain publication immediately',async()=>{const sql=vi.fn().mockResolvedValue([{failures:3}]);expect(await reviewWorkerFailure(sql as any,'fixture','publish',true)).toBe(3);expect(sql.mock.calls[0]).toContain(3);});
