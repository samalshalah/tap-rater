import {describe,it,expect} from 'vitest';
import {weeklyScanPeriod} from '@/lib/heatmap-schedule';
describe('weekly heatmap campaign periods',()=>{
 it('keeps Sunday and Monday separate at New York midnight',()=>{
  expect(weeklyScanPeriod(new Date('2026-10-26T03:59:59Z'))).toBe('2026-10-19');
  expect(weeklyScanPeriod(new Date('2026-10-26T04:00:00Z'))).toBe('2026-10-26');
 });
 it('does not restart the campaign week at a month or year boundary',()=>{
  expect(weeklyScanPeriod(new Date('2027-01-01T12:00:00Z'))).toBe('2026-12-28');
  expect(weeklyScanPeriod(new Date('2026-11-01T12:00:00Z'))).toBe('2026-10-26');
 });
 it('uses local midnight after daylight saving changes',()=>{
  expect(weeklyScanPeriod(new Date('2026-11-02T04:59:59Z'))).toBe('2026-10-26');
  expect(weeklyScanPeriod(new Date('2026-11-02T05:00:00Z'))).toBe('2026-11-02');
 });
});
