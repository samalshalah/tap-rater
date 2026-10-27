"use client";
import dynamic from 'next/dynamic';
import {WorkspaceLoading} from './workspace-ui';
import {WorkspaceDetails} from './workspace-details';
import {LocalLocationSummary} from './local-location-summary';
import type {Location,Snapshot} from './local-dashboard-types';
import type {ListingStatus} from './local-dashboard-data';
const ProfileAgentControls=dynamic(()=>import('./review-automation-controls').then(m=>m.ProfileAgentControls),{loading:()=> <WorkspaceLoading label="Loading workspace view"/>});
const OverviewLocationInsights=dynamic(()=>import('./overview-location-insights').then(m=>m.OverviewLocationInsights),{loading:()=> <WorkspaceLoading label="Loading workspace view"/>});
const ReviewOverview=dynamic(()=>import('./review-overview').then(m=>m.ReviewOverview),{loading:()=> <WorkspaceLoading label="Loading workspace view"/>});
const DirectoryManager=dynamic(()=>import('./directory-manager').then(m=>m.DirectoryManager),{loading:()=> <WorkspaceLoading label="Loading workspace view"/>});
const LocalIssueCenter=dynamic(()=>import('./local-issue-center').then(m=>m.LocalIssueCenter),{loading:()=> <WorkspaceLoading label="Loading workspace view"/>});
const LocationHeatmap=dynamic(()=>import('./location-heatmap').then(m=>m.LocationHeatmap),{loading:()=> <WorkspaceLoading label="Loading workspace view"/>});
const GoogleProfileManager=dynamic(()=>import('./google-profile-manager').then(m=>m.GoogleProfileManager),{loading:()=> <WorkspaceLoading label="Loading workspace view"/>});
const GoogleLiveReviews=dynamic(()=>import('./google-live-reviews').then(m=>m.GoogleLiveReviews),{loading:()=> <WorkspaceLoading label="Loading workspace view"/>});


type Tab='overview'|'heatmap'|'performance'|'reviews'|'profile'|'listings'|'notifications'|'business';
type Props={tab:Tab;data:Snapshot|null;visible:Location[];selected:Location|undefined;location:string;customer:string;accountLocations:Location[];query:string;setQuery:(value:string)=>void;listingStatus:Map<string,ListingStatus>;choose:(id:string)=>void;openTab:(tab:Tab,id?:string)=>void;refresh:()=>Promise<void>;admin:boolean;save:(body:unknown)=>Promise<any>;busy:boolean;businessIds:string[]|undefined};
export function LocalDashboardViews({tab,data,visible,selected,location,customer,accountLocations,query,setQuery,listingStatus,choose,openTab,refresh,admin,save,busy,businessIds}:Props){return <>
  {tab==='overview'&&data&&<ReviewOverview onSaved={()=>refresh()} locations={visible} onReviews={()=>openTab('reviews')} onProfile={()=>openTab('profile')} onIssues={()=>openTab('notifications')}/>}
  {tab==='overview'&&selected&&<div className="mt-3"><OverviewLocationInsights key={selected.id} businessId={selected.id} onProfile={()=>openTab('profile')} onHeatmap={()=>openTab('heatmap')}/></div>}
  {((tab==='overview'&&!location&&accountLocations.length>1)||tab==='performance')&&(tab==='performance'?<WorkspaceDetails label="Saved reviews & listing summary">{<LocalLocationSummary tab={tab} query={query} setQuery={setQuery} visible={visible} data={data} listingStatus={listingStatus} choose={choose} openTab={openTab}/>}</WorkspaceDetails>:<LocalLocationSummary tab={tab} query={query} setQuery={setQuery} visible={visible} data={data} listingStatus={listingStatus} choose={choose} openTab={openTab}/>)}
  {data&&(tab==='profile'||tab==='performance'||tab==='business')&&(selected?<GoogleProfileManager key={location+tab} businessId={selected.id} admin={admin} view={tab==='business'?'profile':tab} businessInformation={tab==='business'} profileControls={tab==='profile'?<ProfileAgentControls location={selected} onSaved={()=>refresh()} onReview={()=>document.getElementById('profile-improvements')?.click()}/>:undefined}/>:<div className="rounded-xl border border-line bg-white p-6"><h2 className="text-lg font-semibold">Choose a location to continue</h2><p className="mt-2 text-sm text-muted">Select the location you want to manage.</p><div className="mt-4 flex flex-wrap gap-3">{visible.map(l=><button key={l.id} className="tr-button-ghost" onClick={()=>choose(l.id)}>{l.business_name}</button>)}</div></div>)}
  {data&&tab==='heatmap'&&(selected?<LocationHeatmap key={selected.id} businessId={selected.id} admin={admin}/>:<div className="rounded-xl border border-line bg-white p-6"><h2 className="text-lg font-semibold">Choose a location for its heat map</h2><p className="mt-2 text-sm text-muted">Keywords and geographic grids are saved separately for each branch.</p><div className="mt-4 flex flex-wrap gap-3">{visible.map(l=><button key={l.id} className="tr-button-ghost" onClick={()=>choose(l.id)}>{l.business_name}</button>)}</div></div>)}
  {tab==='listings'&&data&&<DirectoryManager key={location+customer} locations={visible} records={data?.listings||[]} save={save} busy={busy}/>}
  {tab==='notifications'&&data&&<LocalIssueCenter key={location||'all'} businessId={location||undefined}/>}
  {tab==='reviews'&&data&&<GoogleLiveReviews key={location+customer} admin={admin} businessId={location||undefined} businessIds={businessIds}/>}
</>;}
