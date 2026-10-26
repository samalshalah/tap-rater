import {it,expect,vi,afterEach} from 'vitest';
import {adminFailureNotifications,failureTitle} from '@/lib/admin-failure-notifications';
const auth=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/admin-auth',()=>({requireAdminApi:auth}));
import {GET} from '@/app/api/admin/notifications/route';
afterEach(()=>vi.clearAllMocks());
it('rejects unauthenticated callers before querying notifications',async()=>{
 auth.mockResolvedValue(Response.json({error:'Admin authentication required.'},{status:401}));
 expect((await GET()).status).toBe(401);
});
it('returns active failure count and a direct admin issue link without updating records',async()=>{
 const sql=vi.fn().mockResolvedValue([{id:'a1',code:'review_import',last_seen:'2026-10-26T20:00:00Z',occurrences:4,path:'/admin/workers',email:'owner@example.com',business_name:'Example',active_count:27}]);
 const result=await adminFailureNotifications(sql as never);
 expect(result.count).toBe(27);expect(result.items[0]).toMatchObject({title:'Review import',client:'owner@example.com',location:'Example',href:'/admin/client-failures/a1'});
 const query=sql.mock.calls[0][0].join('?');
 expect(query).toContain('WHERE f.resolved_at IS NULL');expect(query).toContain('LIMIT 20');expect(query).not.toMatch(/UPDATE|INSERT|DELETE/);expect(sql).toHaveBeenCalledTimes(1);
});
it('handles an empty inbox and system failures',async()=>{
 const sql=vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{id:'id',code:'email_delivery',active_count:1,occurrences:1}]);
 expect(await adminFailureNotifications(sql as never)).toEqual({count:0,items:[]});
 expect((await adminFailureNotifications(sql as never)).items[0]).toMatchObject({client:'System',location:'Account-wide'});
 expect(failureTitle('heatmap-result')).toBe('Heatmap result');
});
