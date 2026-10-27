import type {GridSettings} from './heatmap-data';
export function sameGrid(a:GridSettings,b:GridSettings){return a.keyword===b.keyword&&a.size===b.size&&a.spacingKm===b.spacingKm&&a.language===b.language;}
export function keywordPoints<T extends {trackId:string}>(points:T[],id:string){return points.filter(p=>p.trackId===id);}

export type ScanMatch = {id:string;methodology?:string;anchor:{latitude:number;longitude:number;placeId:string};tracks:{id:string;settings:GridSettings}[]};
export function sameAnchor(a:ScanMatch['anchor'],b:ScanMatch['anchor']){return a.placeId===b.placeId&&a.latitude===b.latitude&&a.longitude===b.longitude;}
export function matchingScan<T extends ScanMatch>(scans:T[],track:{id:string}&GridSettings,anchor:ScanMatch['anchor']|null):T|undefined{
 return anchor?scans.find(s=>s.methodology==='maps-v2'&&sameAnchor(s.anchor,anchor)&&s.tracks.some(t=>t.id===track.id&&sameGrid(t.settings,track))):undefined;
}
export function selectedScan<T extends ScanMatch>(scans:T[],id:string,trackId:string):T|undefined{return scans.find(s=>s.id===id&&s.tracks.some(t=>t.id===trackId));}

// Preserve Array.find's first-result behavior if a snapshot contains duplicate indices.
export function indexFirstMeasurements<T extends {index:number}>(points:T[]):Map<number,T>{
 const index=new Map<number,T>();
 for(const point of points)if(!index.has(point.index))index.set(point.index,point);
 return index;
}
