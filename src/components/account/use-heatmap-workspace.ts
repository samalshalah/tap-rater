'use client';
import {useEffect,useMemo,useState,useRef,useCallback,type FormEvent} from 'react';
import {buildGrid,mapLayout,type GridSettings,type HeatmapTrack} from '@/lib/heatmap-data';
import {indexFirstMeasurements,sameGrid,keywordPoints,matchingScan,selectedScan,sameAnchor} from '@/lib/heatmap-results';
import {compareCompetitors} from '@/lib/heatmap-competitors';
import {formatHeatmapDistance,type DistanceUnit} from '@/lib/heatmap-distance';
import type {HeatmapSnapshot} from './location-heatmap-types';
import {useHeatmapRankStats,createHeatmapPointDisplay} from './heatmap-rank-stats';
const initial:GridSettings={keyword:'',size:5,spacingKm:0.5,language:'en'};
export function useHeatmapWorkspace({businessId,admin=false}:{businessId:string;admin?:boolean}){
 const [data,setData]=useState<HeatmapSnapshot|null>(null),[selected,setSelected]=useState(''),[form,setForm]=useState<GridSettings>(initial),[editing,setEditing]=useState(false),[dirty,setDirty]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[point,setPoint]=useState<number|null>(null),[streets,setStreets]=useState(true),[tileError,setTileError]=useState(false),[latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState('');
 const endpoint=admin?'/api/admin/local/heatmap':'/api/account/local/heatmap';
 const [scanId,setScanId]=useState('');
 const changeScan=useCallback((id:string)=>{setQuote(null);setScanId(id);setPoint(null);},[]);
 const canvasRef=useRef<HTMLDivElement>(null),[viewport,setViewport]=useState({width:1000,height:500});
 const [distanceUnit,setDistanceUnit]=useState<DistanceUnit>('km');
 const distance=(km:number)=>formatHeatmapDistance(km,distanceUnit);
 const [view,setView]=useState<'heatmap'|'competitors'|'keywords'>('heatmap');
 const [pointOpen,setPointOpen]=useState(false);
 useEffect(()=>setPointOpen(false),[selected,scanId,view]);
 const [quote,setQuote]=useState<{id:string;cost:number;settings:GridSettings;expiresAt:string}|null>(null);
 const track=useMemo(()=>data?.tracks.find(t=>t.id===selected),[data?.tracks,selected]);
 const currentScan=useMemo(()=>track?matchingScan(data?.scans||[],track,data?.anchor||null):undefined,[data?.scans,track,data?.anchor]);
 const scan=useMemo(()=>editing?undefined:scanId?selectedScan(data?.scans||[],scanId,selected):currentScan,[editing,scanId,data?.scans,selected,currentScan]);
 const scanTrack=scan?.tracks.find(t=>t.id===selected),settings=editing?form:scanTrack?.settings||track||initial,anchor=scanTrack?scan?.anchor:data?.anchor;
 const measurements=useMemo(()=>scanTrack?keywordPoints(scan?.points||[],selected):[],[scanTrack,scan,selected]);
 const comparison=useMemo(()=>compareCompetitors(measurements,selected,anchor||{placeId:'',title:''},settings.size),[measurements,selected,anchor,settings.size]);
 const contextKey=`${businessId}:${selected}:${scan?.id||'none'}:${editing}`;
 const [businessChoice,setBusinessChoice]=useState<{context:string;id:string}|null>(null),[businessDetails,setBusinessDetails]=useState(false),[sort,setSort]=useState('rank');
 const chosenBusiness=comparison.rows.find(r=>r.placeId===(businessChoice?.context===contextKey?businessChoice.id:anchor?.placeId))||comparison.rows[0];
 const displayMeasurements=useMemo(()=>chosenBusiness.you?measurements:chosenBusiness.ranks.flatMap((rank,index)=>rank===undefined?[]:[{trackId:selected,index,state:'complete',rank,count:20}]),[chosenBusiness,measurements,selected]);
 const measurementsByIndex=useMemo(()=>indexFirstMeasurements(displayMeasurements),[displayMeasurements]);
 const {measurement,label,color}=useMemo(()=>createHeatmapPointDisplay(measurementsByIndex),[measurementsByIndex]);
 const competitorRows=useMemo(()=>comparison.rows.filter(r=>!r.you).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):sort==='coverage'?b.found-a.found:(a.average??Infinity)-(b.average??Infinity)||b.found-a.found),[comparison,sort]);
 const missingCompetitors=measurements.some(p=>p.state==='complete'&&!Array.isArray(p.competitors));
 useEffect(()=>{setBusinessDetails(false);setPoint(null);setPointOpen(false);},[contextKey]);
 function selectBusiness(id:string){setBusinessChoice({context:contextKey,id});setPoint(null);setPointOpen(false);setBusinessDetails(true);}
 async function recoverCompetitors(){if(!scan)return;setBusy(true);setError('');try{const result=await request({action:'competitors',businessId,runId:scan.id,trackId:selected});setData(await request());setNotice(`Loaded competitors for ${result.recovered} points. No new scan or charge.${result.unavailable?' Some results are unavailable.':''}`);}catch(e){setError(e instanceof Error?e.message:'Unable to load saved competitors.');}finally{setBusy(false);}}

 const grid=useMemo(()=>anchor?buildGrid(anchor.latitude,anchor.longitude,settings.size,settings.spacingKm):[],[anchor,settings.size,settings.spacingKm]);
 const map=useMemo(()=>anchor?mapLayout(grid,anchor.latitude,anchor.longitude,viewport.width,viewport.height):null,[grid,anchor,viewport]);
 const historical=Boolean(scanTrack&&track&&(!sameGrid(scanTrack.settings,track)||!data?.anchor||!sameAnchor(scan!.anchor,data.anchor)||scan?.methodology!=='maps-v2'));
 const estimate=(s:GridSettings)=>data?.provider.pointCost===undefined?null:s.size*s.size*data.provider.pointCost;
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{if(!quote)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[quote]);
 const quoteExpired=Boolean(quote&&new Date(quote.expiresAt).getTime()<=now);
 const pending=currentScan?.points.some(p=>p.trackId===selected&&['queued','pending','submitting'].includes(p.state));
 const {targetAverage,completed,found,share}=useHeatmapRankStats(measurements,displayMeasurements);
 const focused=grid.find(p=>p.index===point),span=(settings.size-1)*settings.spacingKm;
 async function request(body?:unknown){const r=await fetch(body?endpoint:`${endpoint}?businessId=${businessId}`,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load tracking.');return d;}
 useEffect(()=>{let active=true;setBusy(true);request().then(d=>{if(active){setData(d);setSelected(d.tracks[0]?.id||'');setEditing(false);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[businessId,endpoint]);
 useEffect(()=>{const element=canvasRef.current;if(!element)return;const observer=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;if(width>100&&height>100)setViewport(previous=>Math.abs(previous.width-width)<1&&Math.abs(previous.height-height)<1?previous:{width,height});});observer.observe(element);return()=>observer.disconnect();},[Boolean(data?.anchor)]);
 function choose(t:HeatmapTrack){setQuote(null);setScanId('');setSelected(t.id);setForm({keyword:t.keyword,size:t.size,spacingKm:t.spacingKm,language:t.language});setEditing(false);setDirty(false);setPoint(null);setNotice('');}
 async function save(body:unknown){setQuote(null);setScanId('');setBusy(true);setError('');setNotice('');try{const result=await request(body),fresh=await request();setData(fresh);if(result.id){const t=fresh.tracks.find((x:HeatmapTrack)=>x.id===result.id);if(t)choose(t);}setNotice('Tracking setup saved in Tap Rater. No Google profile changes or replies were published.');setDirty(false);return true;}catch(e){setError(e instanceof Error?e.message:'Unable to save.');return false;}finally{setBusy(false);}}
 async function scanAction(approve=false){if(!track)return;setBusy(true);setError('');try{const result=await request(approve?{action:'approve',businessId,quoteId:quote?.id}:{action:'quote',businessId,id:track.id,version:track.version});if(approve){setQuote(null);setScanId('');setData(await request());setNotice(result.queued===false?'Sample scan complete.':'Scan approved and queued. Processing starts within 15 minutes. Refresh to see progress.');}else setQuote(result.quote);}catch(e){setQuote(null);setError(e instanceof Error?e.message:'Unable to prepare scan.');}finally{setBusy(false);}}
 useEffect(()=>{if(!pending)return;const timer=setInterval(()=>request().then(setData).catch(()=>{}),15000);return()=>clearInterval(timer);},[pending,businessId,endpoint]);
 function closeEditor(){if(busy)return;if(dirty&&!window.confirm('Discard unsaved keyword changes?'))return;if(track)choose(track);else if(data?.tracks[0])choose(data.tracks[0]);else{setEditing(false);setDirty(false);}setError('');}
 async function submit(e:FormEvent){e.preventDefault();await save(track?{action:'update',businessId,id:track.id,version:track.version,settings:form,active:track.active}:{action:'create',businessId,settings:form});}
 function change<K extends keyof GridSettings>(key:K,value:GridSettings[K]){setQuote(null);setForm({...form,[key]:value});setDirty(true);setPoint(null);}

 return {businessId,admin,initial,data,setData,selected,setSelected,form,setForm,editing,setEditing,dirty,busy,setBusy,error,setError,notice,setNotice,point,setPoint,streets,setStreets,tileError,setTileError,latitude,setLatitude,longitude,setLongitude,scanId,setScanId,changeScan,canvasRef,viewport,distanceUnit,setDistanceUnit,distance,view,setView,pointOpen,setPointOpen,quote,setQuote,track,currentScan,scan,scanTrack,settings,anchor,measurements,comparison,contextKey,businessChoice,businessDetails,setBusinessDetails,sort,setSort,chosenBusiness,measurement,competitorRows,missingCompetitors,selectBusiness,recoverCompetitors,label,color,grid,map,historical,estimate,quoteExpired,pending,targetAverage,completed,found,share,focused,span,request,choose,save,scanAction,closeEditor,submit,change};
}
export type HeatmapWorkspace=ReturnType<typeof useHeatmapWorkspace>;
