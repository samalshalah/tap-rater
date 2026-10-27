import type {GridSettings,HeatmapAnchor,HeatmapTrack} from '@/lib/heatmap-data';
import type {RankCompetitor} from '@/lib/dataforseo';
export type Scan={id:string;methodology?:string;period:string;created_at?:string;submitted_at?:string|null;anchor:HeatmapAnchor;tracks:{id:string;version:number;settings:GridSettings}[];points:{trackId:string;index:number;state:string;rank:number|null;count:number|null;competitors?:RankCompetitor[]|null}[]};
export type HeatmapSnapshot={anchor:HeatmapAnchor|null;tracks:HeatmapTrack[];provider:{accountPaused?:boolean;cadence?:'weekly'|'four_monthly';monthlyPoints?:number;pointsUsed?:number;pointCost?:number;connected:boolean;status:string;scheduled:boolean;manualEnabled?:boolean;monthlyCap?:number;reserved?:number};scans:Scan[]};
