"use client";
import {heatmapFeatureEnabled} from '@/lib/heatmap-feature';
import {WorkspaceDetails} from './workspace-details';
import {WorkspacePageHeader,WorkspaceLoading} from './workspace-ui';
import {ProfileAgentControls} from './review-automation-controls';
import {OverviewLocationInsights} from './overview-location-insights';
import {ReviewOverview,type OverviewLocation} from './review-overview';
import {restoreCustomerLocation} from '@/lib/customer-location-selection';
import {useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useState,type FormEvent} from 'react';
import {Building2,MessageSquare,Plus,ShieldCheck,LockKeyhole,MapPin,Search} from 'lucide-react';
import {DirectoryManager,type DirectoryLocation,type DirectoryRecord} from './directory-manager';
import {LocalIssueCenter} from './local-issue-center';
import {LocationHeatmap} from './location-heatmap';
import {GoogleProfileManager} from './google-profile-manager';
import {GoogleLiveReviews} from './google-live-reviews';

type Location=OverviewLocation&DirectoryLocation&{id:string;customer_id:string;email:string;business_name:string;address:string|null;phone:string|null;website_url:string|null;connected:boolean;google_title:string|null;synced_at:string|null;next_page:string|null;last_error:string|null;review_count:number;unanswered_count:number;draft_count:number};
type Listing=DirectoryRecord&{id:string;business_id:string;directory:string;status:string;listing_url:string;listed_name:string;listed_address:string;listed_phone:string;notes:string;version:number;updated_at:string};
type Snapshot={licenses?:{location_limit:number;unlimited_locations:boolean;used:number}|null;locations:Location[];listings:Listing[];customers:{id:string;email:string}[]};
const field='mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm';
export function LocalDashboard({admin=false,initialTab='overview',preferenceKey}:{admin?:boolean;initialTab?:'overview'|'heatmap'|'performance'|'reviews'|'profile'|'listings'|'notifications'|'business';preferenceKey?:string}) {
 const router=useRouter();
 const requestedLocation=useSearchParams().get('location');
 const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const clientTab=!admin&&!heatmapFeatureEnabled&&initialTab==='heatmap'?'profile':initialTab;
 const [tab,setTab]=useState<'overview'|'listings'|'reviews'|'profile'|'performance'|'heatmap'|'notifications'|'business'>(clientTab),[storedLocation,setLocation]=useState(''),[customer,setCustomer]=useState(''),[query,setQuery]=useState('');
 const location=admin?storedLocation:(requestedLocation??'');
 const [adding,setAdding]=useState(false);
 const endpoint=admin?'/api/admin/local':'/api/account/local';
 const storageKey=!admin&&preferenceKey?`taprater:local-location:${preferenceKey}`:null;
 async function refresh(restore=false){const r=await fetch(endpoint,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);
  if(restore&&storageKey){
   let saved:string|null=null;try{const params=new URLSearchParams(window.location.search);saved=params.get('location')??(initialTab==='overview'?'':window.localStorage.getItem(storageKey));const view=params.get('view');if(['overview','profile','performance','heatmap','listings','reviews'].includes(view||''))setTab(!heatmapFeatureEnabled&&view==='heatmap'?'profile':view as typeof tab);}catch{/* Storage may be unavailable in private browsing. */}
   // A saved preference never grants access; accept only locations returned for this account.
   const restored=restoreCustomerLocation(saved,d.locations);setLocation(restored);try{window.localStorage.setItem(storageKey,restored);}catch{}
  }
 }
 useEffect(()=>{refresh(true).catch(e=>setError(e.message));},[endpoint,storageKey]);
 async function save(body:unknown){setBusy(true);setError('');setNotice('');try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);await refresh();setNotice('Saved in Tap Rater. Nothing was published.');return d;}catch(e){setError(e instanceof Error?e.message:'Unable to save.');return null;}finally{setBusy(false);}}
 const accountLocations=data?.locations.filter(l=>!customer||l.customer_id===customer)||[];
 const visible=accountLocations.filter(l=>(!location||l.id===location)&&(!query||[l.business_name,l.address,l.email].join(' ').toLowerCase().includes(query.toLowerCase())));
 const canAdd=admin||Boolean(data?.licenses&&(data.licenses.unlimited_locations||data.licenses.used<data.licenses.location_limit));
 const selected=data?.locations.find(l=>l.id===location);
 const total=(key:'review_count'|'unanswered_count'|'draft_count')=>visible.reduce((sum,l)=>sum+Number(l[key]||0),0);
 async function addLocation(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const d=await save({action:'createLocation',...(admin?{customerId:f.get('customerId')}:{}),name:f.get('name'),address:f.get('address'),phone:f.get('phone'),website:f.get('website')});if(d){setAdding(false);choose(d.id);}}
 function openTab(next:typeof tab,id=location){if(admin){setTab(next);return;}const routes={overview:'/account',reviews:'/account/reviews',profile:'/account/profile',heatmap:'/account/heatmap',listings:'/account/local',performance:'/account/reports',notifications:'/account/notifications',business:'/account/business'};router.push(routes[next]+'?location='+encodeURIComponent(id));}
 function choose(id:string){setLocation(id);setQuery('');if(!admin){const url=new URL(window.location.href);url.searchParams.set('location',id);window.history.replaceState(null,'',url);}if(storageKey)try{window.localStorage.setItem(storageKey,id);}catch{/* Selection still works without storage. */}}
 function locationSummary(){return <>
    {tab==='performance'&&<div className="mb-3"><h2 className="text-lg font-semibold">Location report</h2><p className="mt-1 text-sm text-muted">Current saved totals, not a date-range report. Select a location for dated Google performance below.</p></div>}
    <label className="mb-3 flex max-w-md items-center gap-2 rounded-lg border border-line bg-white px-3"><Search size={16}/><input aria-label="Search locations" className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Search locations" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="tr-location-cards">{visible.map(l=>{
 const issues=data?.listings.filter(d=>d.business_id===l.id&&['missing','needs_update'].includes(d.status)).length||0;
 return <article key={l.id} className="tr-location-card"><header className="tr-card-heading"><strong>{l.business_name}</strong><span className={'tr-card-status '+(l.last_error?'is-warning':'')}>{l.last_error?'Import needs attention':l.connected?'Connected':'Not connected'}</span></header><div className="tr-card-body"><p className="text-sm text-muted">{l.address||'Address not provided'}</p><div className="tr-card-metrics">{[['Reviews',l.synced_at?l.review_count:'—'],['Unanswered',l.synced_at?l.unanswered_count:'—'],['Drafts',l.draft_count]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="text-xs text-muted">Last import: {l.synced_at?new Date(l.synced_at).toLocaleString():'Never imported'}</p>{l.last_error&&<details className="mt-2 text-xs text-red-700"><summary>Import details</summary>{l.last_error}</details>}<p className="mt-2 text-sm">Listings: {issues?`${issues} need attention`:data?.listings.some(d=>d.business_id===l.id&&d.checked_at)?'No recorded issues':'Not checked'}</p></div><footer><button className="tr-button-ghost" onClick={()=>{choose(l.id);openTab('reviews',l.id);}}>{!l.connected?'Connect Google':l.draft_count?'Review drafts':'Reviews'}</button><button className="tr-button-ghost" onClick={()=>{choose(l.id);openTab('listings',l.id);}}>Listings</button>{tab==='performance'&&<button className="tr-button-ghost" onClick={()=>choose(l.id)}>Performance</button>}</footer></article>;
 })}</div>{data&&!visible.length&&<p className="p-5 text-sm text-muted">{query?'No matching locations.':'No locations yet. Add a location to get started.'}</p>}{!data&&<p className="p-4 text-sm text-muted">Location totals will appear after loading.</p>}</>;}
 if(!admin&&data&&location&&!data.locations.some(l=>l.id===location))return <section className="tr-card p-5"><p>This location is unavailable.</p><a className="tr-button-ghost mt-3" href="/account/locations">View locations</a></section>;
 return <section className="tr-local-workspace">
  <WorkspacePageHeader title={admin?'Locations & client work':({overview:'Overview',reviews:'Reviews',profile:'Google Profile',performance:'Reports',heatmap:'Heat Map',listings:'Directory Listings',notifications:'Issues & Approvals',business:'Business Information'}[tab])} description={({overview:'Your review activity and next actions.',reviews:'Read reviews, prepare replies, and manage approvals.',profile:'Improve your Google presence and review suggested changes.',performance:'Understand how customers find and engage with your business.',heatmap:'Track your visibility across local search results.',listings:'Monitor directory accuracy and resolve listing issues.',notifications:'Review the items that need your attention.',business:'Keep your business details accurate and up to date.'}[tab])} actions={admin?<button className="tr-button-primary" onClick={()=>setAdding(!adding)}><Plus size={16}/>Add location</button>:undefined}/>
  {admin&&<div className="tr-client-location-controls">
   {admin&&<label className="text-sm">Customer<select className={field} value={customer} onChange={e=>{setCustomer(e.target.value);choose('');}}><option value="">All customers</option>{data?.customers.map(c=><option key={c.id} value={c.id}>{c.email}</option>)}</select></label>}
   <label className="tr-client-location-label">Location<span className="tr-client-location-input"><MapPin size={18} aria-hidden="true"/><select className={field} value={location} onChange={e=>choose(e.target.value)}><option value="">All locations ({accountLocations.length})</option>{accountLocations.map(l=><option key={l.id} value={l.id}>{l.business_name}{l.address?' · '+l.address:''}{admin?' · '+l.email:''}</option>)}</select></span></label>
   <span className="tr-client-draft-badge"><LockKeyhole size={15}/>Profile changes stay drafts</span>
  </div>}
  {error&&<div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error} <button className="underline" onClick={()=>{setError('');refresh().catch(e=>setError(e.message));}}>Try again</button></div>}
  {notice&&<p role="status" className="mb-4 text-sm text-emerald-800">{notice}</p>}
  {!data&&!error&&<WorkspaceLoading label="Loading your workspace"/>}
  {adding&&!canAdd&&<section className="mb-4 rounded-xl border border-line bg-white p-4"><h2 className="font-semibold">Add a business license</h2><p className="my-2 text-sm">Each business location needs its own $29/month license. Your current licenses are in use. Purchase an additional license before adding another business.</p><a className="tr-button-primary" href="/account/packages">Manage location licenses</a><button className="tr-button-ghost ml-2" onClick={()=>setAdding(false)}>Cancel</button></section>}
  {adding&&canAdd&&<form onSubmit={addLocation} className="mb-6 rounded-xl border border-line bg-white p-3"><h2 className="text-lg font-semibold">Add a location to your account</h2><p className="mt-1 text-sm text-muted">Each location keeps its own Google assignment, reviews and directory records.</p><fieldset disabled={busy} className="mt-4 grid gap-4 md:grid-cols-2">{admin&&<label className="text-sm">Customer<select name="customerId" required className={field} defaultValue={customer}><option value="">Choose customer</option>{data?.customers.map(c=><option key={c.id} value={c.id}>{c.email}</option>)}</select></label>}<label className="text-sm">Location name<input name="name" required maxLength={200} className={field} placeholder="Business name — Downtown"/></label><label className="text-sm">Address<input name="address" maxLength={1000} className={field}/></label><label className="text-sm">Phone<input name="phone" maxLength={80} className={field}/></label><label className="text-sm">Website<input name="website" type="url" maxLength={2048} className={field}/></label><div className="flex items-end gap-2"><button className="tr-button-primary">{busy?'Saving…':'Save location'}</button><button type="button" className="tr-button-ghost" onClick={()=>setAdding(false)}>Cancel</button></div></fieldset></form>}
  {admin&&<nav aria-label="Local management" className="mb-4 flex gap-4 overflow-x-auto border-b border-line">{(['overview','profile','performance','heatmap','listings','reviews'] as const).map(t=><button key={t} aria-current={tab===t?'page':undefined} onClick={()=>{setTab(t);setQuery('');}} className={'shrink-0 border-b-2 px-1 py-2 text-sm font-semibold '+(tab===t?'border-ink text-ink':'border-transparent text-muted')}>{t==='overview'?'Overview':t==='profile'?'Google profile':t==='performance'?'Reports':t==='heatmap'?'Heat map':t==='listings'?'Directory listings':'Reviews & approvals'}</button>)}</nav>}

  {tab==='overview'&&data&&<ReviewOverview onSaved={()=>refresh()} locations={visible} onReviews={()=>openTab('reviews')} onProfile={()=>openTab('profile')} onIssues={()=>openTab('notifications')}/>}
  {tab==='overview'&&selected&&<div className="mt-3"><OverviewLocationInsights key={selected.id} businessId={selected.id} onProfile={()=>openTab('profile')} onHeatmap={()=>openTab('heatmap')}/></div>}
  {((tab==='overview'&&!location&&accountLocations.length>1)||tab==='performance')&&(tab==='performance'?<WorkspaceDetails label="Saved reviews & listing summary">{locationSummary()}</WorkspaceDetails>:locationSummary())}
  {data&&(tab==='profile'||tab==='performance'||tab==='business')&&(selected?<GoogleProfileManager key={location+tab} businessId={selected.id} admin={admin} view={tab==='business'?'profile':tab} businessInformation={tab==='business'} profileControls={tab==='profile'?<ProfileAgentControls location={selected} onSaved={()=>refresh()} onReview={()=>document.getElementById('profile-improvements')?.click()}/>:undefined}/>:<div className="rounded-xl border border-line bg-white p-6"><h2 className="text-lg font-semibold">Choose a location to continue</h2><p className="mt-2 text-sm text-muted">Select the location you want to manage.</p><div className="mt-4 flex flex-wrap gap-3">{visible.map(l=><button key={l.id} className="tr-button-ghost" onClick={()=>choose(l.id)}>{l.business_name}</button>)}</div></div>)}
  {data&&tab==='heatmap'&&(selected?<LocationHeatmap key={selected.id} businessId={selected.id} admin={admin}/>:<div className="rounded-xl border border-line bg-white p-6"><h2 className="text-lg font-semibold">Choose a location for its heat map</h2><p className="mt-2 text-sm text-muted">Keywords and geographic grids are saved separately for each branch.</p><div className="mt-4 flex flex-wrap gap-3">{visible.map(l=><button key={l.id} className="tr-button-ghost" onClick={()=>choose(l.id)}>{l.business_name}</button>)}</div></div>)}
  {tab==='listings'&&data&&<DirectoryManager key={location+customer} locations={visible} records={data?.listings||[]} save={save} busy={busy}/>}
  {tab==='notifications'&&data&&<LocalIssueCenter key={location||'all'} businessId={location||undefined}/>}
  {tab==='reviews'&&data&&<GoogleLiveReviews key={location+customer} admin={admin} businessId={location||undefined} businessIds={customer?accountLocations.map(l=>l.id):undefined}/>}
 </section>;
}
