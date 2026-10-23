import {compareCompetitors,type CompetitorPoint} from './heatmap-competitors';
export function summarizeKeyword(points:(CompetitorPoint&{rank:number|null})[],trackId:string,target:{placeId:string;title:string},size:number){
 const scoped=[...new Map(points.filter(p=>p.trackId===trackId&&p.index>=0&&p.index<size*size).map(p=>[p.index,p])).values()];
 const completed=scoped.filter(p=>p.state==='complete');
 const ranked=completed.filter(p=>p.rank!==null&&p.rank>=1&&p.rank<=20);
 const comparison=compareCompetitors(scoped,trackId,target,size);
 const bands=[ranked.filter(p=>p.rank!<=3).length,ranked.filter(p=>p.rank!>=4&&p.rank!<=10).length,ranked.filter(p=>p.rank!>=11).length,completed.filter(p=>p.rank===null).length];
 return {average:ranked.length?ranked.reduce((n,p)=>n+p.rank!,0)/ranked.length:null,shareOfVoice:comparison.rows.find(r=>r.you)?.shareOfVoice??null,voiceCaptured:comparison.captured,completed:completed.length,total:size*size,bands,percentages:bands.map(n=>completed.length?n/completed.length*100:null)};
}
