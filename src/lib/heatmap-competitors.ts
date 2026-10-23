import type {RankCompetitor} from './dataforseo';
export type CompetitorPoint={trackId:string;index:number;state:string;competitors?:RankCompetitor[]|null};
export function compareCompetitors(points:CompetitorPoint[],trackId:string,target:{placeId:string;title:string},size:number){
 const captured=points.filter(p=>p.trackId===trackId&&p.state==='complete'&&Array.isArray(p.competitors)&&p.index>=0&&p.index<size*size);
 const unique=[...new Map(captured.map(p=>[p.index,p])).values()];
 const rows=new Map<string,{placeId:string;title:string;address:string|null;rating:number|null;reviews:number|null;ranks:(number|null|undefined)[]}>();
 const add=(c:Omit<RankCompetitor,'rank'>)=>{if(!rows.has(c.placeId))rows.set(c.placeId,{...c,ranks:Array.from({length:size*size},(_,i)=>unique.some(p=>p.index===i)?null:undefined)});return rows.get(c.placeId)!;};
 add({...target,address:null,rating:null,reviews:null});
 for(const p of unique)for(const c of p.competitors||[]){
  if(!Number.isInteger(c.rank)||c.rank<1||c.rank>20)continue;
  const row=add(c);row.title=c.placeId===target.placeId?target.title:c.title;
  row.address=c.address;row.rating=c.rating;row.reviews=c.reviews;
  row.ranks[p.index]=Math.min(row.ranks[p.index]??21,c.rank);
 }
 return {captured:unique.length,rows:[...rows.values()].map(row=>{
  const ranks=row.ranks.filter((r):r is number=>typeof r==='number');
  return {...row,you:row.placeId===target.placeId,found:ranks.length,average:ranks.length?ranks.reduce((a,b)=>a+b,0)/ranks.length:null,top3:unique.length?ranks.filter(r=>r<=3).length/unique.length*100:null};
 }).sort((a,b)=>Number(b.you)-Number(a.you)||b.found-a.found||(a.average??21)-(b.average??21)||a.title.localeCompare(b.title))};
}
