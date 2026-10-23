import {describe,it,expect} from 'vitest';
import {summarizeOverview,type OverviewLocation} from '@/components/account/review-overview';
const a:OverviewLocation={id:'a',business_name:'A',connected:true,review_count:10,unanswered_count:3,draft_count:1,rating_summary:{sum:40,count:10},review_growth:[{month:'2026-10',rating:'FIVE',count:2},{month:'2026-09',rating:'ONE',count:1}]};
const b:OverviewLocation={id:'b',business_name:'B',connected:true,review_count:2,unanswered_count:1,draft_count:0,rating_summary:{sum:2,count:2},review_growth:[{month:'2026-10',rating:'ONE',count:2}]};
describe('review overview calculations',()=>{
 it('keeps selected locations separate',()=>{const s=summarizeOverview([a],new Date('2026-10-23'));expect(s.total).toBe(10);expect(s.average).toBe(4);expect(s.months.at(-1)?.counts).toEqual([2,0,0,0,0,0]);});
 it('weights aggregate rating by review count and sums matching months',()=>{const s=summarizeOverview([a,b],new Date('2026-10-23'));expect(s.average).toBe(3.5);expect(s.months.at(-1)?.counts).toEqual([2,0,0,0,2,0]);expect(s.unanswered).toBe(4);});
 it('keeps empty ratings unknown and fills missing months',()=>{const s=summarizeOverview([],new Date('2026-01-01'));expect(s.average).toBeNull();expect(s.months[0].key).toBe('2025-02');expect(s.months).toHaveLength(12);expect(s.total).toBe(0);});
});
