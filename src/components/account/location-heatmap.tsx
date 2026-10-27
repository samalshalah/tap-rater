'use client';
import {useHeatmapWorkspace} from './use-heatmap-workspace';
import {HeatmapKeywordOverview} from './heatmap-keyword-overview';
import {HeatmapKeywordEditor} from './heatmap-keyword-editor';
import {formatHeatmapScanDate} from '@/lib/heatmap-scan-date';
import dynamic from 'next/dynamic';
import {HeatmapDetailsDialogs} from './heatmap-details-dialogs';
import {HeatmapResultsView} from './heatmap-results-view';
import {HeatmapScanToolbar} from './heatmap-scan-toolbar';
import {HeatmapSetupHeader} from './heatmap-setup-header';
const HeatmapCompetitors=dynamic(()=>import('./heatmap-competitors').then(module=>module.HeatmapCompetitors),{loading:()=> <p role="status">Loading competitor comparison…</p>});
export type {HeatmapSnapshot} from './location-heatmap-types';
export function LocationHeatmap(props:{businessId:string;admin?:boolean}){return <LocationHeatmapWorkspace key={props.businessId} {...props}/>;}
function LocationHeatmapWorkspace(props:{businessId:string;admin?:boolean}){
 const model=useHeatmapWorkspace(props);
 const {businessId,initial,data,setData,selected,setSelected,form,setForm,editing,setEditing,dirty,busy,setBusy,error,setError,setNotice,setPoint,setScanId,distanceUnit,distance,view,setView,setQuote,track,scan,scanTrack,settings,anchor,measurements,historical,estimate,span,request,choose,closeEditor,submit,change}=model;
 return <section className="tr-marketing-feature tr-heatmap-feature space-y-3">
<HeatmapSetupHeader model={model}/>
  {data?.anchor&&<>
   <div hidden={view==='keywords'} className="tr-heatmap-view space-y-3">
<HeatmapScanToolbar model={model}/>

    {editing?<HeatmapKeywordEditor track={track} busy={busy} error={error} form={form} closeEditor={closeEditor} submit={submit} change={change} distance={distance} distanceUnit={distanceUnit} span={span} estimate={estimate}/>:null}
    {scanTrack&&historical&&<p role="status" className="rounded-lg border border-line bg-slate-50 p-3 text-sm">{historical?'Historical result — different from current tracking settings.':'Showing saved scan.'} {settings.keyword} · {settings.size} × {settings.size} · {distance(settings.spacingKm)} {distanceUnit} spacing · {distance(span)} × {distance(span)} {distanceUnit} area · {settings.language} · {formatHeatmapScanDate(scan||{},true)}. New scan quotes use the current saved settings above.</p>}
<HeatmapResultsView model={model}/></div>
   {view==='keywords'&&<HeatmapKeywordOverview data={data} busy={busy} dirty={dirty} distance={distance} distanceUnit={distanceUnit} choose={choose} setView={setView} onAdd={()=>{setView('heatmap');setQuote(null);setScanId('');setSelected('');setForm(initial);setEditing(true);setPoint(null);}}/>}

   {view==='competitors'&&!editing&&<HeatmapCompetitors keyword={settings.keyword} scanDate={scan?formatHeatmapScanDate(scan):undefined} key={`${selected}:${scan?.id||'none'}`} points={measurements} trackId={selected} target={anchor||data.anchor} size={settings.size} busy={busy} hasScan={Boolean(scan)} onRecover={async()=>{if(!scan)return;setBusy(true);setError('');setNotice('');try{const result=await request({action:'competitors',businessId,runId:scan.id,trackId:selected});setData(await request());setNotice(`Loaded competitors for ${result.recovered} points at no additional cost.${result.unavailable?' Some points could not be retrieved; you can retry.':''}`);}catch(e){setError(e instanceof Error?e.message:'Unable to load competitors.');}finally{setBusy(false);}}}/>}
  </>}
<HeatmapDetailsDialogs model={model}/>
 </section>;
}
