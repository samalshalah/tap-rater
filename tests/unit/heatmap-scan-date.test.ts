import {it,expect} from 'vitest';
import {formatHeatmapScanDate} from '@/lib/heatmap-scan-date';
it('uses actual submission instead of the scheduled week or initial failed attempt',()=>{
 expect(formatHeatmapScanDate({submitted_at:'2026-10-25T05:31:04.809Z',created_at:'2026-10-25T05:01:07.215Z'})).toBe('2026-10-25');
 expect(formatHeatmapScanDate({submitted_at:'2026-10-25T05:31:04.809Z'},true)).toBe('2026-10-25 · 1:31 AM EDT');
});
it('uses New York calendar dates across UTC midnight',()=>{
 expect(formatHeatmapScanDate({submitted_at:'2026-10-25T02:30:00Z'})).toBe('2026-10-24');
});
it('handles legacy runs without inventing a scan date from the weekly period',()=>{
 expect(formatHeatmapScanDate({created_at:'2026-10-25T05:01:07Z'})).toBe('2026-10-25');
 expect(formatHeatmapScanDate({})).toBe('Date unavailable');
});
