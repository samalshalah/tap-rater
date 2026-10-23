import {it,expect} from 'vitest';
import {summarizeKeyword} from '@/lib/heatmap-keyword-summary';
const target={placeId:'own',title:'Own'};
const c=(placeId:string,rank:number)=>({placeId,title:placeId,rank,address:null,rating:null,reviews:null});
it('summarizes only the selected keyword and completed ranks with shared visibility methodology',()=>{
 const result=summarizeKeyword([
 {trackId:'a',index:0,state:'complete',rank:2,competitors:[c('own',2),c('other',1)]},
 {trackId:'a',index:1,state:'complete',rank:null,competitors:[c('other',1)]},
 {trackId:'a',index:2,state:'pending',rank:null},
 {trackId:'b',index:0,state:'complete',rank:1,competitors:[c('own',1)]},
 ],'a',target,3);
 expect(result).toMatchObject({average:2,completed:2,total:9,voiceCaptured:2,bands:[1,0,0,1],percentages:[50,0,0,50]});
 expect(result.shareOfVoice).toBeCloseTo(20);
});
it('does not turn missing scans or competitor captures into zero visibility',()=>{
 expect(summarizeKeyword([],'a',target,3)).toMatchObject({average:null,shareOfVoice:null,completed:0,percentages:[null,null,null,null]});
 expect(summarizeKeyword([{trackId:'a',index:0,state:'complete',rank:1}],'a',target,3)).toMatchObject({average:1,shareOfVoice:null,completed:1});
});
it('deduplicates points and ignores out-of-grid records',()=>{
 const point={trackId:'a',index:0,state:'complete',rank:5};
 expect(summarizeKeyword([point,point,{...point,index:9}],'a',target,3)).toMatchObject({completed:1,average:5,bands:[0,1,0,0]});
});
