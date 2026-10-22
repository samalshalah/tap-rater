import {it,expect} from 'vitest';
import {sameGrid,keywordPoints} from '@/lib/heatmap-results';
it('keeps different keyword ranks isolated at the same grid point',()=>{const points=[{trackId:'a',index:12,rank:1},{trackId:'b',index:12,rank:9}];expect(keywordPoints(points,'b')).toEqual([points[1]]);expect(keywordPoints(points,'c')).toEqual([]);});
it('matches actual search settings despite pause or resume version changes',()=>{const a={keyword:'boutique',size:5 as const,spacingKm:0.5 as const,language:'en' as const};expect(sameGrid(a,{...a})).toBe(true);expect(sameGrid(a,{...a,keyword:'clothing'})).toBe(false);expect(sameGrid(a,{...a,spacingKm:1})).toBe(false);});
