import {it,expect,vi} from 'vitest';
import {sendReviewWorkerAlerts} from '@/lib/review-worker-alerts';
it('sends operational alerts to configured support without review content and records delivery',async()=>{
 vi.stubEnv('SUPPORT_ALERT_EMAIL','support@example.test');
 const sql=vi.fn().mockResolvedValueOnce([{business_id:'location-fixture',stage:'import',failures:3,business_name:'Norah Boutique',address:'50 Massachusetts Ave NE, Washington, DC',customer_name:'Norah',customer_email:'owner@example.test'}]).mockResolvedValue([]),send=vi.fn().mockResolvedValue({sent:true});
 await sendReviewWorkerAlerts(sql as any,send);expect(send).toHaveBeenCalledOnce();expect(send.mock.calls[0][0].to).toBe('support@example.test');expect(send.mock.calls[0][0].subject).toBe('Tap Rater: Norah Boutique — review automation needs attention');expect(send.mock.calls[0][0].html).toContain('Client: Norah. Location: Norah Boutique — 50 Massachusetts Ave NE, Washington, DC. review import failed 3 times.');expect(send.mock.calls[0][0].html).toContain('/admin/ai-agent');expect(sql.mock.calls[1][0].join('')).toContain('emailed_at=now()');vi.unstubAllEnvs();
});
it('retains failed email deliveries for retry after the draft retry threshold',async()=>{
 vi.stubEnv('SUPPORT_ALERT_EMAIL','support@example.test');const sql=vi.fn().mockResolvedValue([{business_id:'fixture',stage:'draft',failures:10}]);
 await sendReviewWorkerAlerts(sql as any,vi.fn().mockResolvedValue({sent:false,reason:'temporary'}));expect(sql).toHaveBeenCalledOnce();vi.unstubAllEnvs();
});
