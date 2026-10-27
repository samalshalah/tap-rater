import {useMemo} from 'react';
type Measurement={state:string;rank:number|null};
export function summarizeHeatmapRanks<T extends Measurement>(measurements:T[]){
 const completed=measurements.filter(point=>point.state==='complete');
 const found=completed.filter(point=>point.rank!==null);
 const share=(min:number,max:number)=>completed.length?`${(completed.filter(point=>point.rank!==null&&point.rank>=min&&point.rank<=max).length/completed.length*100).toFixed(0)}%`:'—';
 return {completed,found,share};
}
export function useHeatmapRankStats<T extends Measurement,U extends Measurement>(measurements:T[],displayMeasurements:U[]){
 const targetAverage=useMemo(()=>{const ranks=measurements.filter(point=>point.state==='complete'&&point.rank!==null);return ranks.length?(ranks.reduce((sum,point)=>sum+(point.rank||0),0)/ranks.length).toFixed(1):'—';},[measurements]);
 const summary=useMemo(()=>summarizeHeatmapRanks(displayMeasurements),[displayMeasurements]);
 return {targetAverage,...summary};
}

export function createHeatmapPointDisplay<T extends Measurement & {count?:number|null}>(index:Map<number,T>){
 const measurement=(point:number)=>index.get(point);
 const label=(index:number)=>{const p=measurement(index);return !p?'Not scanned':p.state==='complete'?(p.rank?`Rank ${p.rank}`:`Not found among ${p.count??0} returned results`):p.state==='error'||p.state==='uncertain'?'Scan needs attention':p.state==='queued'?'Queued':'Processing';};
 const color=(index:number)=>{const p=measurement(index);return p?.state!=='complete'?'#475569':p.rank===null?'#dc2626':p.rank<=3?'#047857':p.rank<=10?'#ca8a04':'#ea580c';};

 return {measurement,label,color};
}
