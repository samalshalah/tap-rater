"use client";
import {WorkspacePageHeader,WorkspaceLoading} from './workspace-ui';


import {restoreCustomerLocation} from '@/lib/customer-location-selection';
import {useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useState,type FormEvent} from 'react';
import {Plus} from 'lucide-react';
import type {Snapshot} from './local-dashboard-types';
import {useLocalDashboardData} from './local-dashboard-data';
import {LocalDashboardViews} from './local-dashboard-views';
import {LocalLocationControls,LocalLocationForm} from './local-location-controls';





export function LocalDashboard({admin=false,initialTab='overview',preferenceKey,initialSnapshot=null}:{admin?:boolean;initialTab?:'overview'|'heatmap'|'performance'|'reviews'|'profile'|'listings'|'notifications'|'business';preferenceKey?:string;initialSnapshot?:Snapshot|null}) {
 const router=useRouter();
 const requestedLocation=useSearchParams().get('location');
 const [data,setData]=useState<Snapshot|null>(admin?null:initialSnapshot),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const clientTab=['overview','reviews'].includes(initialTab)?initialTab:'reviews';
 const [tab,setTab]=useState<'overview'|'listings'|'reviews'|'profile'|'performance'|'heatmap'|'notifications'|'business'>(clientTab),[storedLocation,setLocation]=useState(''),[customer,setCustomer]=useState(''),[query,setQuery]=useState('');
 // Start the selected view's code download alongside its data request.
 useEffect(()=>{
  const pending=tab==='reviews'?import('./google-live-reviews'):
   tab==='listings'?import('./directory-manager'):
   tab==='notifications'?import('./local-issue-center'):
   tab==='heatmap'?import('./location-heatmap'):
   tab==='overview'?Promise.all([import('./review-overview'),import('./overview-location-insights')]):
   Promise.all([import('./google-profile-manager'),...(tab==='profile'?[import('./review-automation-controls')]:[])]);
  void pending.catch(()=>{/* The rendered view owns loading and error handling. */});
 },[tab]);
 const location=admin?storedLocation:(requestedLocation??'');
 const [adding,setAdding]=useState(false);
 const endpoint=admin?'/api/admin/local':'/api/account/local';
 const storageKey=!admin&&preferenceKey?`taprater:local-location:${preferenceKey}`:null;
 async function refresh(restore=false){const r=await fetch(endpoint,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);if(restore)restorePreference(d);
 }
 function restorePreference(d:Snapshot){
  if(storageKey){
   let saved:string|null=null;try{const params=new URLSearchParams(window.location.search);saved=params.get('location')??(initialTab==='overview'?'':window.localStorage.getItem(storageKey));const view=params.get('view');if(['overview','reviews'].includes(view||''))setTab(view as typeof tab);}catch{/* Storage may be unavailable in private browsing. */}
   // A saved preference never grants access; accept only locations returned for this account.
   const restored=restoreCustomerLocation(saved,d.locations);setLocation(restored);try{window.localStorage.setItem(storageKey,restored);}catch{}
  }
 }
 useEffect(()=>{
  if(!admin&&initialSnapshot){setData(initialSnapshot);restorePreference(initialSnapshot);}
  else refresh(true).catch(e=>setError(e.message));
 },[endpoint,storageKey,initialSnapshot]);
 async function save(body:unknown){setBusy(true);setError('');setNotice('');try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);await refresh();setNotice('Saved in Tap Rater. Nothing was published.');return d;}catch(e){setError(e instanceof Error?e.message:'Unable to save.');return null;}finally{setBusy(false);}}
 const {accountLocations,visible,selected,listingStatus,businessIds}=useLocalDashboardData(data,customer,location,query);
 const canAdd=admin||Boolean(data?.licenses&&(data.licenses.unlimited_locations||data.licenses.used<data.licenses.location_limit));
 async function addLocation(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const d=await save({action:'createLocation',...(admin?{customerId:f.get('customerId')}:{}),name:f.get('name'),address:f.get('address'),phone:f.get('phone'),website:f.get('website')});if(d){setAdding(false);choose(d.id);}}
 function openTab(next:typeof tab,id=location){if(admin){setTab(next);return;}const routes={overview:'/account',reviews:'/account/reviews',profile:'/account/profile',heatmap:'/account/heatmap',listings:'/account/local',performance:'/account/reports',notifications:'/account/notifications',business:'/account/business'};router.push(routes[next]+'?location='+encodeURIComponent(id));}
 function choose(id:string){setLocation(id);setQuery('');if(!admin){const url=new URL(window.location.href);url.searchParams.set('location',id);window.history.replaceState(null,'',url);}if(storageKey)try{window.localStorage.setItem(storageKey,id);}catch{/* Selection still works without storage. */}}

 if(!admin&&data&&location&&!data.locations.some(l=>l.id===location))return <section className="tr-card p-5"><p>This location is unavailable.</p><a className="tr-button-ghost mt-3" href="/account/locations">View locations</a></section>;
 return <section className="tr-local-workspace">
  <WorkspacePageHeader title={admin?'Locations & client work':({overview:'Overview',reviews:'Reviews',profile:'Google Profile',performance:'Reports',heatmap:'Heat Map',listings:'Directory Listings',notifications:'Issues & Approvals',business:'Business Information'}[tab])} description={({overview:'Your review activity and next actions.',reviews:'Read reviews, prepare replies, and manage approvals.',profile:'Improve your Google presence and review suggested changes.',performance:'Understand how customers find and engage with your business.',heatmap:'Track your visibility across local search results.',listings:'Monitor directory accuracy and resolve listing issues.',notifications:'Review the items that need your attention.',business:'Keep your business details accurate and up to date.'}[tab])} actions={admin?<button className="tr-button-primary" onClick={()=>setAdding(!adding)}><Plus size={16}/>Add location</button>:undefined}/>
  <LocalLocationControls admin={admin} data={data} customer={customer} setCustomer={setCustomer} choose={choose} location={location} accountLocations={accountLocations}/>
  {error&&<div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error} <button className="underline" onClick={()=>{setError('');refresh().catch(e=>setError(e.message));}}>Try again</button></div>}
  {notice&&<p role="status" className="mb-4 text-sm text-emerald-800">{notice}</p>}
  {!data&&!error&&<WorkspaceLoading label="Loading your workspace"/>}
  <LocalLocationForm admin={admin} data={data} customer={customer} adding={adding} canAdd={canAdd} busy={busy} setAdding={setAdding} addLocation={addLocation}/>
  {admin&&<nav aria-label="Local management" className="mb-4 flex gap-4 overflow-x-auto border-b border-line">{(['overview','profile','performance','heatmap','listings','reviews'] as const).map(t=><button key={t} aria-current={tab===t?'page':undefined} onClick={()=>{setTab(t);setQuery('');}} className={'shrink-0 border-b-2 px-1 py-2 text-sm font-semibold '+(tab===t?'border-ink text-ink':'border-transparent text-muted')}>{t==='overview'?'Overview':t==='profile'?'Google profile':t==='performance'?'Reports':t==='heatmap'?'Heat map':t==='listings'?'Directory listings':'Reviews & approvals'}</button>)}</nav>}

  <LocalDashboardViews tab={tab} data={data} visible={visible} selected={selected} location={location} customer={customer} accountLocations={accountLocations} query={query} setQuery={setQuery} listingStatus={listingStatus} choose={choose} openTab={openTab} refresh={refresh} admin={admin} save={save} busy={busy} businessIds={businessIds}/>
 </section>;
}
