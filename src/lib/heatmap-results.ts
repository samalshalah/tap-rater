import type {GridSettings} from './heatmap-data';
export function sameGrid(a:GridSettings,b:GridSettings){return a.keyword===b.keyword&&a.size===b.size&&a.spacingKm===b.spacingKm&&a.language===b.language;}
export function keywordPoints<T extends {trackId:string}>(points:T[],id:string){return points.filter(p=>p.trackId===id);}
