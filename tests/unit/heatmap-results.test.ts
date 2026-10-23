import {it,expect} from 'vitest';
import {sameGrid,keywordPoints,matchingScan,selectedScan} from '@/lib/heatmap-results';
it('keeps different keyword ranks isolated at the same grid point',()=>{const points=[{trackId:'a',index:12,rank:1},{trackId:'b',index:12,rank:9}];expect(keywordPoints(points,'b')).toEqual([points[1]]);expect(keywordPoints(points,'c')).toEqual([]);});
it('matches actual search settings despite pause or resume version changes',()=>{const a={keyword:'boutique',size:5 as const,spacingKm:0.5 as const,language:'en' as const};expect(sameGrid(a,{...a})).toBe(true);expect(sameGrid(a,{...a,keyword:'clothing'})).toBe(false);expect(sameGrid(a,{...a,spacingKm:1})).toBe(false);});

const anchor={latitude:38.9,longitude:-77,placeId:'norah'};
const track={id:'keyword-a',keyword:'boutique',size:5 as const,spacingKm:0.5 as const,language:'en' as const};
const scan={id:'scan-a',methodology:'maps-v2',anchor,tracks:[{id:track.id,settings:track}]};
it('never reuses results for a different keyword, area, language, pin or location',()=>{
 expect(matchingScan([scan],track,anchor)).toBe(scan);
 for(const change of [{keyword:'clothing'},{spacingKm:1 as const},{size:7 as const},{language:'es' as const},{id:'other-location-track'}])expect(matchingScan([scan],{...track,...change},anchor)).toBeUndefined();
 expect(matchingScan([scan],track,{...anchor,latitude:39})).toBeUndefined();
 expect(matchingScan([scan],track,{...anchor,placeId:'another-business'})).toBeUndefined();
 expect(matchingScan([{...scan,methodology:'legacy'}],track,anchor)).toBeUndefined();
});
it('only opens history belonging to the selected keyword',()=>{
 expect(selectedScan([scan],'scan-a','keyword-a')).toBe(scan);
 expect(selectedScan([scan],'scan-a','keyword-b')).toBeUndefined();
});
it('finds the matching older scan without substituting newer results from other areas',()=>{
 const changed={...scan,id:'new-area',tracks:[{id:track.id,settings:{...track,spacingKm:2 as const}}]};
 expect(matchingScan([changed,scan],track,anchor)?.id).toBe('scan-a');
});
