"use client";
import {activateListRow} from './list-row-action';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {Building2,Plus,Search,Pencil,Trash2,X,AlertCircle,AlertTriangle,CheckCircle2,Clock3,Pause,Play} from 'lucide-react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import {NotificationBellButton,NotificationSettingsDialog} from './review-notification-locations';
import {AiRepliesButton,AiRepliesDialog} from './ai-reply-locations';
import type {ReviewEmailSettings} from '@/lib/review-email-preferences';
import {WorkspacePageHeader} from './workspace-ui';
import {GoogleConnectionWizard} from './google-connection-wizard';
import {BusinessEditor} from './business-information';
import {SetupBusinessPicker} from './setup-business-picker';
import type {GoogleBusinessSelection} from '@/lib/google-places-client';
import type {AccountBusiness} from '@/lib/account-business-drafts';
import {draftHealth} from '@/lib/customer-location-health';
type Location={plan_managed?:boolean;plan_active?:boolean;service_pause_available?:boolean;service_paused?:boolean;settings_version:number;id:string;business_name:string;address:string;connected:boolean;google_assignment_exists:boolean;google_enabled:boolean;google_connection_available:boolean;synced_at:string|null;last_error:string|null;draft_error:string|null;draft_due_at:string|null;ai_consent?:boolean;auto_enabled:boolean;auto_four:boolean;auto_five:boolean;draft_low_stars:boolean;unanswered_count:number;positive_unanswered_count:number;review_count:number;draft_count:number;manual_draft_count:number;active_draft_count:number;historical_draft_count:number;local_profile_version:number;rating_summary:{sum:number;count:number}};
type Snapshot={locations:Location[];listings:{business_id:string;status:string}[];licenses?:{unlimited_locations:boolean;location_limit:number;used:number;period_locked?:boolean;reserved_until?:string|null}};

const locationStatuses = {
 ended: {label:'Service ended', icon:Clock3, className:''},
 serviceActive: {label:'Service active', icon:CheckCircle2, className:'is-success'},
 servicePaused: {label:'Service paused', icon:Pause, className:''},
 connect: {label:'Connect Google', icon:AlertCircle, className:'is-danger'},
 import: {label:'Review import failed', icon:AlertCircle, className:'is-danger'},
 draft: {label:'Automatic drafting will retry', icon:AlertTriangle, className:'is-warning'},
 updating: {label:'Updating reviews', icon:Clock3, className:'is-brand'},
 paused: {label:'Reply automation off', icon:AlertTriangle, className:''},
 connected: {label:'Connected', icon:CheckCircle2, className:'is-success'},
};
const statusOrder = Object.keys(locationStatuses);

function statusFor(location: Location): keyof typeof locationStatuses {
 if (location.plan_managed&&!location.plan_active) return 'ended';
 if (location.service_paused) return 'servicePaused';
 if (!location.connected) return 'connect';
 if (location.last_error) return 'import';
 if (location.draft_error) return 'draft';
 if (!location.synced_at || Date.now()-new Date(location.synced_at).getTime()>45*60*1000) return 'updating';
 if (location.service_pause_available) return 'serviceActive';
 return location.auto_enabled ? 'connected' : 'paused';
}

function needsAttention(location: Location) {
 const status = statusFor(location);
 return status === 'connect' || status === 'import' || draftHealth(location.draft_error)?.requiresAttention === true;
}

export function CustomerLocations({businesses,notifications={},email=''}:{businesses:AccountBusiness[];notifications?:Record<string,ReviewEmailSettings>;email?:string}){
 const router=useRouter(),params=useSearchParams();
 const [data,setData]=useState<Snapshot|null>(null),[items,setItems]=useState(businesses),[query,setQuery]=useState(''),[view,setView]=useState<'attention'|'tasks'|'all'>('all'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [connecting,setConnecting]=useState<{id:string;name:string;address:string}|null>(null);
 const [selection,setSelection]=useState<GoogleBusinessSelection|null>(null);
 const [serviceTarget,setServiceTarget]=useState<Location|null>(null);
 const [editing,setEditing]=useState<AccountBusiness|null>(null),[adding,setAdding]=useState(false),[removing,setRemoving]=useState<Location|null>(null);
 const [notifying,setNotifying]=useState<string|null>(()=>params.get('notify'));
 const [aiTarget,setAiTarget]=useState<{id:string;name:string}|null>(()=>{const id=params.get('ai');return id?{id,name:''}:null;});
 function closeAi(){setAiTarget(null);if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('ai')){const next=new URLSearchParams(window.location.search);next.delete('ai');window.history.replaceState(null,'',window.location.pathname+(next.size?'?'+next.toString():''));}}
 function closeNotifications(){setNotifying(null);if(typeof window!=='undefined'&&params.get('notify')){const next=new URLSearchParams(window.location.search);next.delete('notify');window.history.replaceState(null,'',window.location.pathname+(next.size?'?'+next.toString():''));}router.refresh?.();}
 async function refresh(){const r=await fetch('/api/account/local',{cache:'no-store'});const value=await r.json();if(!r.ok)throw Error(value.error);setData(value);}
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
 async function mutate(value:object,refreshAfter=true){const r=await fetch('/api/account/local',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const result=await r.json();if(!r.ok)throw Error(result.error);if(refreshAfter){await refresh();router.refresh();}return result;}
 async function add(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy||!selection)return;setBusy(true);setError('');try{const fields={name:selection.name,address:selection.formattedAddress,phone:'',website:''};const result=await mutate({action:'createLocation',...fields},false);setItems(old=>[...old,{id:result.id,current:fields,draft:null,version:0}]);setAdding(false);setSelection(null);setNotice('');setConnecting({id:result.id,name:fields.name,address:fields.address});router.refresh();refresh().catch(()=>setNotice('Location added. Refresh the list to see the latest details.'));}catch(e){setError(e instanceof Error?e.message:'Could not add location.');}finally{setBusy(false);}}
 async function remove(){if(!removing||busy)return;setBusy(true);setError('');try{await mutate({action:'deleteLocation',businessId:removing.id,version:removing.local_profile_version});setRemoving(null);setNotice('Location removed.');}catch(e){setError(e instanceof Error?e.message:'Could not remove location.');}finally{setBusy(false);}}
 async function toggleService(){if(!serviceTarget||busy)return;setBusy(true);setError('');try{const paused=!serviceTarget.service_paused;await mutate({action:'setServicePaused',businessId:serviceTarget.id,paused,version:serviceTarget.settings_version});setServiceTarget(null);setView('all');setNotice(paused?'Service paused. Imports and drafting have stopped. Billing and your licence are unchanged.':'Service resumed. Imports and drafting can continue with your saved settings.');}catch(e){setError(e instanceof Error?e.message:'Could not update service.');}finally{setBusy(false);}}
 const canAdd=Boolean(data?.licenses&&(data.licenses.unlimited_locations||data.licenses.used<data.licenses.location_limit));
 const selectedLocationId=params.get('location')||'';
 const selectedLocation=data?.locations.find(l=>l.id===selectedLocationId);
 const matchingLocations=useMemo(()=>data?.locations.filter(l=>{if(selectedLocationId&&l.id!==selectedLocationId)return false;const info=items.find(b=>b.id===l.id);return [info?.draft?.name||l.business_name,info?.draft?.address||l.address].join(' ').toLowerCase().includes(query.toLowerCase());})||[],[data,items,query,selectedLocationId]);
 const summary=useMemo(()=>{
  const locations=data?.locations||[];
  const needsAction=locations.filter(needsAttention).length;
  const tasks=locations.reduce((total,l)=>total+(Number(l.active_draft_count)||0),0);
  const history=locations.reduce((total,l)=>total+(Number(l.historical_draft_count)||0),0);
  return {needsAction,tasks,history,connected:locations.filter(l=>l.connected).length};
 },[data]);
 const visible=useMemo(()=>matchingLocations.filter(l=>selectedLocationId||view==='all'||(view==='tasks'?Number(l.active_draft_count)>0:needsAttention(l))).sort((a,b)=>{
  const rank=(location:Location)=>statusOrder.indexOf(statusFor(location));
  const difference=rank(a)-rank(b);if(difference)return difference;
  return (Number(b.active_draft_count)||0)-(Number(a.active_draft_count)||0);
 }),[matchingLocations,selectedLocationId,view]);
 const modal=(title:string,content:React.ReactNode,onClose:()=>void)=><ModalDialog labelledBy="location-dialog-title" onClose={()=>{if(!busy)onClose();}}><div className="tr-card w-[min(520px,calc(100vw-32px))] max-h-[90dvh] overflow-auto p-5"><header className="mb-4 flex items-center justify-between"><strong id="location-dialog-title" data-dialog-heading tabIndex={-1}>{title}</strong><button aria-label="Close" disabled={busy} onClick={onClose}><X size={20}/></button></header>{error&&<p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}{content}</div></ModalDialog>;
 return <section className="tr-locations-page"><WorkspacePageHeader title="Locations" subtitle="Manage your locations, review tasks and service status." actions={<button className="tr-button-primary flex items-center gap-2" disabled={!data} onClick={()=>{setError('');setSelection(null);setAdding(true);}}><Plus size={16}/>Add location</button>}/>
 {!adding&&!removing&&!serviceTarget&&error&&<p role="alert" className="mb-3 text-red-700">{error} <button onClick={()=>refresh().catch(e=>setError(e.message))}>Retry</button></p>}{notice&&<p role="status" className="mb-3 text-sm text-teal-700">{notice}</p>}
 {data&&!selectedLocationId&&<div className="tr-locations-summary mb-5 grid gap-3 sm:grid-cols-3"><button type="button" className={`rounded-lg border p-4 text-left transition ${view==='attention'?'border-brand bg-brand/5':'border-line bg-white hover:border-brand/40'}`} onClick={()=>setView('attention')}><span className="block text-xs font-semibold uppercase tracking-wide text-muted">Location health</span><strong className="mt-1 block text-2xl text-ink">{summary.needsAction}</strong><span className="mt-1 block text-sm text-muted">need attention</span></button><button type="button" className={`rounded-lg border p-4 text-left transition ${view==='tasks'?'border-brand bg-brand/5':'border-line bg-white hover:border-brand/40'}`} onClick={()=>setView('tasks')}><span className="block text-xs font-semibold uppercase tracking-wide text-muted">Current reply tasks</span><strong className="mt-1 block text-2xl text-ink">{summary.tasks.toLocaleString()}</strong><span className="mt-1 block text-sm text-muted">drafts waiting for review</span></button><button type="button" className={`rounded-lg border p-4 text-left transition ${view==='all'?'border-brand bg-brand/5':'border-line bg-white hover:border-brand/40'}`} onClick={()=>setView('all')}><span className="block text-xs font-semibold uppercase tracking-wide text-muted">Connected locations</span><strong className="mt-1 block text-2xl text-ink">{summary.connected}</strong><span className="mt-1 block text-sm text-muted">connected to Google</span></button></div>}
 <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><label className="flex w-full max-w-sm items-center gap-2 rounded-md border border-line bg-white px-3"><Search size={16}/><input aria-label="Search locations" className="w-full bg-transparent text-sm outline-none" placeholder="Search locations" value={query} onChange={e=>setQuery(e.target.value)}/></label>{data&&!selectedLocationId&&<div className="tr-segmented flex text-sm" role="group" aria-label="Location view"><button type="button" aria-pressed={view==='attention'} className={`rounded px-3 py-1.5 `} onClick={()=>setView('attention')}>Location health</button><button type="button" aria-pressed={view==='tasks'} className={`rounded px-3 py-1.5 `} onClick={()=>setView('tasks')}>Reply tasks</button><button type="button" aria-pressed={view==='all'} className={`rounded px-3 py-1.5 `} onClick={()=>setView('all')}>All locations</button></div>}</div>
 {data&&<p className="mb-3 text-xs text-muted">{selectedLocation?`Showing ${selectedLocation.business_name}`:view==='attention'?`${visible.length} ${visible.length===1?'location needs':'locations need'} attention`:view==='tasks'?`${visible.length} locations with current reply tasks`:`${visible.length} of ${data.locations.length} locations`}{summary.history>0&&<> · {summary.history.toLocaleString()} older draft{summary.history===1?'':'s'} are kept in review history</>}</p>}
 {!data&&!error&&<p role="status">Loading locations...</p>}
  <div className="grid gap-3" role="list" aria-label="Google review locations">
     {visible.map(location => {
      const business = items.find(item => item.id === location.id);
      const info = business?.draft || business?.current;
      const status = statusFor(location);
      const {label, icon: StatusIcon, className} = locationStatuses[status];
      const draft = draftHealth(location.draft_error);
      const detail = status === 'import' ? 'Tap Rater will retry the Google review import.' : status === 'draft' ? draft?.detail : null;
      const statusLabel = status === 'draft' ? draft?.label || label : label;
      const reviewHref = `/account/reviews?location=${location.id}`;
      const reviewCount = Number(location.review_count) || 0;
      const taskCount = Number(location.active_draft_count) || 0;
      const destination = status!=='ended'&&!location.service_paused&&taskCount > 0 ? `${reviewHref}&view=tasks` : reviewHref;
      const actionLabel = (status==='ended'||location.service_paused)?'View review history':taskCount > 0 ? `Review ${taskCount} ${taskCount===1?'task':'tasks'}`
       : status === 'paused' ? 'Manage replies' : status === 'draft' || status === 'import' ? 'Open Reviews' : 'View review history';
      const name=info?.name||location.business_name, address=info?.address||location.address||'Address not added';
      return <article key={location.id} role="listitem" data-dashboard-row onClick={event=>activateListRow(event,()=>router.push(destination))} className="tr-stand-row tr-card tr-location-row p-4">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
         <div className="tr-stand-thumbnail flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white p-1"><Building2 size={22} className="text-muted" aria-hidden="true"/></div>
         <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
           <h3 className="text-base font-medium text-ink"><Link className="text-left hover:underline" href={`/account/profile?location=${location.id}`} onClick={event=>event.stopPropagation()}>{name}</Link></h3>
           <span className={`tr-badge ${className}`}><StatusIcon size={14} className="shrink-0" aria-hidden="true"/>{statusLabel}</span>
           {business?.draft&&<span className="tr-badge is-brand">Draft</span>}
          </div>
          <p className="mt-1 truncate text-xs text-muted" title={address}>{address}</p>
          <p className="mt-1 text-xs text-muted">{reviewCount.toLocaleString()} review{reviewCount===1?'':'s'} · <span className={taskCount>0?'text-amber-800':''}>{taskCount>0?`${taskCount} current ${taskCount===1?'task':'tasks'}`:'No current tasks'}</span>{detail&&<> · {detail}</>}</p>
         </div>
        </div>
        <div className="tr-location-manage flex shrink-0 flex-wrap items-center gap-2">
         {status!=='ended'&&location.service_pause_available&&location.google_assignment_exists&&(location.google_enabled||location.service_paused)&&<button type="button" className="tr-button-ghost tr-service-control" title={location.service_paused?'Resume service':'Pause service'} aria-label={`${location.service_paused?'Resume service':'Pause service'} for ${location.business_name}`} onClick={event=>{event.stopPropagation();setError('');setServiceTarget(location);}}>{location.service_paused?<Play size={14} aria-hidden="true"/>:<Pause size={14} aria-hidden="true"/>}</button>}
         {location.connected&&status!=='ended'&&<AiRepliesButton name={name} location={location} onOpen={()=>setAiTarget({id:location.id,name})}/>}
         {notifications[location.id]&&<NotificationBellButton name={name} settings={notifications[location.id]} onOpen={()=>setNotifying(location.id)}/>}
         <button className="tr-button-ghost" title="Edit location" aria-label={`Edit ${location.business_name}`} disabled={!business} onClick={event=>{event.stopPropagation();setNotice('');setEditing(business||null);}}><Pencil size={14}/></button>
         <button className="tr-button-ghost" title="Delete location" aria-label={`Delete ${location.business_name}`} onClick={event=>{event.stopPropagation();setError('');setRemoving(location);}}><Trash2 size={14}/></button>
         {status==='connect'?<button type="button" className="tr-button-primary whitespace-nowrap" onClick={event=>{event.stopPropagation();setConnecting({id:location.id,name,address:info?.address||location.address});}}>Connect Google</button>
          :<Link className="tr-button-primary whitespace-nowrap" href={destination} onClick={event=>event.stopPropagation()}>{actionLabel}</Link>}
        </div>
       </div>
      </article>;
     })}
  </div>
 {data&&!visible.length&&<div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-muted">{query?'No matching locations.':view==='attention'&&data.locations.length?'No locations need attention.':view==='tasks'&&data.locations.length?'No current reply tasks.':'Add your first location to get started.'}</div>}
 {aiTarget&&<AiRepliesDialog businessId={aiTarget.id} name={aiTarget.name||data?.locations.find(l=>l.id===aiTarget.id)?.business_name||'Location'} onClose={closeAi} onSaved={()=>{refresh().catch(()=>{});}}/>}
 {notifying&&notifications[notifying]&&<NotificationSettingsDialog name={data?.locations.find(l=>l.id===notifying)?.business_name||items.find(b=>b.id===notifying)?.current?.name||'Location'} email={email} settings={notifications[notifying]} onClose={closeNotifications}/>}
 {editing&&<BusinessEditor business={editing} onClose={()=>setEditing(null)} onSaved={(draft,version)=>{setItems(old=>old.map(b=>b.id===editing.id?{...b,draft,version}:b));setEditing(null);setNotice('Business draft saved.');}}/>}
 {adding&&modal('Add location',canAdd?<form className="tr-account-form grid gap-4" onSubmit={add}><fieldset disabled={busy}><SetupBusinessPicker label="Business name" onChange={setSelection}/></fieldset><footer className="flex justify-end gap-2"><button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>setAdding(false)}>Cancel</button><button className="tr-button-primary" disabled={busy||!selection}>{busy?'Adding...':'Add location'}</button></footer></form>:<><p className="mb-4 text-sm">{data?.licenses?.period_locked?`All licences are reserved for this paid period${data.licenses.reserved_until?` until ${new Date(data.licenses.reserved_until).toLocaleDateString()}`:''}. Removed locations keep their licence until a successful renewal. Add a replacement after renewal.`:'All location licences are in use.'}</p><Link className="tr-button-primary" href="/account/packages">Manage licences</Link></>,()=>setAdding(false))}
 {connecting&&<ModalDialog labelledBy="connect-location-title" onClose={()=>setConnecting(null)}><div className="tr-card flex h-[min(620px,90dvh)] w-[min(780px,calc(100vw-32px))] flex-col overflow-hidden p-5"><header className="flex items-start justify-between gap-4"><div><h2 id="connect-location-title" data-dialog-heading tabIndex={-1}>Connect Google</h2><p className="mt-1 text-xs font-semibold">{connecting.name}</p><p className="mt-0.5 text-xs text-muted">{connecting.address}</p></div><button type="button" className="tr-button-ghost" aria-label="Close Google connection" onClick={()=>setConnecting(null)}><X size={18}/></button></header><div className="min-h-0 flex-1 overflow-y-auto"><GoogleConnectionWizard key={connecting.id} businessId={connecting.id} compact onClose={()=>setConnecting(null)} onLinked={async()=>{const id=connecting.id;setConnecting(null);router.push(`/account/reviews?location=${encodeURIComponent(id)}`);router.refresh();}}/></div></div></ModalDialog>}
 {serviceTarget&&modal(serviceTarget.service_paused?'Resume service':'Pause service',<><p className="text-sm">{serviceTarget.service_paused?'Resume review imports and drafting for':'Pause review imports and drafting for'} <strong>{serviceTarget.business_name}</strong>?</p><p className="mt-3 text-sm text-muted">{serviceTarget.service_paused?'Your saved settings and remaining allowance will be used.':'Your reviews, drafts and settings will be kept.'} Billing and your location licence stay unchanged. This does not cancel your subscription.</p><p className="mt-3 text-xs"><Link className="text-brand underline" href="/account/packages">View subscription</Link></p><footer className="mt-5 flex justify-end gap-2"><button type="button" className="tr-button-ghost tr-service-control" disabled={busy} onClick={()=>setServiceTarget(null)}>Go back</button><button type="button" className="tr-button-primary tr-service-control" disabled={busy} onClick={toggleService}>{busy?'Saving…':serviceTarget.service_paused?'Resume service':'Pause service'}</button></footer></>,()=>setServiceTarget(null))}
 {removing&&modal('Delete location',<><p className="text-sm">Remove <strong>{removing.business_name}</strong> from Google Reviews? Imports and automation will stop. Your Google listing, stands and orders will stay unchanged. Deleting a location does not cancel a subscription or change billing.</p>{data?.licenses?.period_locked&&<p className="mt-3 text-sm">This location’s licence stays reserved for the rest of the current access period. Deleting it does not make the slot available for another business.</p>}<footer className="mt-5 flex justify-end gap-2"><button className="tr-button-ghost" disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button><button className="tr-button-primary" disabled={busy} onClick={remove}>{busy?'Removing...':'Delete location'}</button></footer></>,()=>setRemoving(null))}
 </section>;
}
