"use client";
import type {RefObject} from "react";
import type {GridPoint,mapLayout} from "@/lib/heatmap-data";
type Props = {
 canvasRef: RefObject<HTMLDivElement | null>;
 map: ReturnType<typeof mapLayout>;
 streets: boolean;
 tileError: boolean;
 setTileError: (value: boolean) => void;
 viewport: {width: number; height: number};
 grid: GridPoint[];
 point: number | null;
 color: (index: number) => string;
 measurement: (index: number) => {state: string; rank: number | null} | undefined;
 label: (index: number) => string;
 setPoint: (index: number) => void;
 setPointOpen: (value: boolean) => void;
 anchorTitle: string;
};
export function HeatmapMapCanvas({canvasRef, map, streets, tileError, setTileError, viewport, grid, point, color, measurement, label, setPoint, setPointOpen, anchorTitle}: Props) {
 return <div ref={canvasRef} className="tr-heatmap-canvas relative overflow-hidden bg-slate-100">
      {streets&&!tileError&&<div aria-hidden="true" className="absolute inset-0">{map.tiles.map(t=><img key={`${t.zoom}-${t.x}-${t.y}`} alt="" referrerPolicy="origin" draggable={false} onError={()=>setTileError(true)} src={`https://tile.openstreetmap.org/${t.zoom}/${t.x}/${t.y}.png`} style={{position:'absolute',left:`${t.left/viewport.width*100}%`,top:`${t.top/viewport.height*100}%`,width:`${256/viewport.width*100}%`,height:`${256/viewport.height*100}%`,maxWidth:'none'}}/>)}</div>}
      <svg viewBox={`0 0 ${viewport.width} ${viewport.height}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`Tracking grid with ${grid.length} points centered on ${anchorTitle}`}><path d={`M${viewport.width/2} 0V${viewport.height}M0 ${viewport.height/2}H${viewport.width}`} stroke="#64748b" strokeDasharray="5 7" opacity=".3"/>{map.points.map(p=><g key={p.index}><circle cx={p.x} cy={p.y} r={p.index===point?17:14} fill={color(p.index)} stroke="white" strokeWidth="3"/><text x={p.x} y={p.y+5} textAnchor="middle" fontSize="12" fontWeight="600" fill="white">{measurement(p.index)?.state==='complete'?(measurement(p.index)?.rank??'×'):'—'}</text></g>)}<path d={`M${viewport.width/2} ${viewport.height/2-18}l-6-9h12z`} fill="#d97706" stroke="white" strokeWidth="1"/></svg>
      {map.points.map(p=><button key={p.index} aria-label={`Point ${p.index+1}, ${p.latitude}, ${p.longitude}: ${label(p.index)}`} onClick={()=>{setPoint(p.index);setPointOpen(true);}} style={{position:'absolute',left:`${p.x/viewport.width*100}%`,top:`${p.y/viewport.height*100}%`,transform:'translate(-50%,-50%)'}} className="h-9 w-9 rounded-full focus:outline focus:outline-4 focus:outline-emerald-500"><span className="sr-only">Inspect point {p.index+1}</span></button>)}
      <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs" aria-label="North">N ↑</span>
      <div className="absolute bottom-2 right-2 rounded bg-white/95 px-2 py-1 text-[10px]">{streets&&!tileError?<><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report map issue</a></>:<span>{tileError?'Street map unavailable · ':' '}Geographic grid preview</span>}</div>
     </div>;
}
