import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {adminSectionFor} from '@/components/admin/admin-page-header';

it('labels each admin page with its sidebar section',()=>{
 expect(adminSectionFor('/admin')).toBe('Dashboard');
 expect(adminSectionFor('/admin/orders')).toBe('Commerce');
 expect(adminSectionFor('/admin/orders/abc')).toBe('Commerce');
 expect(adminSectionFor('/admin/requests')).toBe('Operations');
 expect(adminSectionFor('/admin/settings/emails')).toBe('System');
 expect(adminSectionFor('/admin/review-operations')).toBe('Client Operations');
 expect(adminSectionFor('/somewhere-else')).toBeNull();
});

it('uses the shared header on every main admin list page',()=>{
 for(const file of ['src/app/admin/orders/page.tsx','src/app/admin/subscriptions/page.tsx','src/app/admin/requests/page.tsx','src/app/admin/products/page.tsx','src/app/admin/offers/page.tsx','src/app/admin/inventory/page.tsx','src/app/admin/taxes/page.tsx','src/app/admin/shipping/page.tsx','src/app/admin/content/page.tsx','src/app/admin/business-uses/page.tsx','src/app/admin/settings/page.tsx','src/app/admin/settings/emails/page.tsx','src/app/admin/analytics/page.tsx','src/app/admin/client-failures/page.tsx','src/components/admin/client-operations.tsx','src/components/admin/worker-health.tsx','src/components/admin/review-operations.tsx','src/components/admin/service-usage.tsx']){
  expect(readFileSync(file,'utf8'),file).toContain('<AdminPageHeader');
 }
});
