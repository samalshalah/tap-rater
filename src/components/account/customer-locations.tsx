"use client";
import {activateListRow} from './list-row-action';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {Building2,Plus,Search,Pencil,Trash2,X,AlertCircle,AlertTriangle,CheckCircle2,Clock3} from 'lucide-react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import {GoogleConnectionWizard} from './google-connection-wizard';
import {BusinessEditor} from './business-information';
import {SetupBusinessPicker} from './setup-business-picker';
import type {GoogleBusinessSelection} from '@/lib/google-places-client';
import type {AccountBusiness} from '@/lib/account-business-drafts';
import {draftHealth} from '@/lib/customer-location-health';
type Location={id:string;business_name:string;address:string;connected:boolean;google_assignment_exists:boolean;google_enabled:boolean;google_connection_available:boolean;synced_at:string|null;last_error:string|null;draft_error:string|null;draft_due_at:string|null;auto_enabled:boolean;auto_four:boolean;auto_five:boolean;draft_low_stars:boolean;unanswered_count:number;positive_unanswered_count:number;review_count:number;draft_count:number;manual_draft_count:number;active_draft_count:number;historical_draft_count:number;local_profile_version:number;rating_summary:{sum:number;count:number}};
type Snapshot={locations:Location[];listings:{business_id:string;status:string}[];licenses?:{unlimited_locations:boolean;location_limit:number;used:number}};

const locationStatuses = {
 connect: {label:'Connect Google', icon:AlertCircle, className:'border-red-200 bg-red-50 text-red-700'},
 import: {label:'Review import failed', icon:AlertCircle, className:'border-red-200 bg-red-50 text-red-700'},
 draft: {label:'Automatic drafting will retry', icon:AlertTriangle, className:'border-amber-200 bg-amber-50 text-amber-800'},
 updating: {label:'Updating reviews', icon:Clock3, className:'border-violet-200 bg-violet-50 text-violet-800'},
 paused: {label:'Reply automation off', icon:AlertTriangle, className:'border-slate-200 bg-slate-50 text-slate-700'},
 connected: {label:'Connected', icon:CheckCircle2, className:'border-emerald-200 bg-emerald-50 text-emerald-700'},
};
const statusOrder = Object.keys(locationStatuses);

function statusFor(location: Location): keyof typeof locationStatuses {
 if (!location.connected) return 'connect';
 if (location.last_error) return 'import';
 if (location.draft_error) return 'draft';
 if (!location.synced_at || Date.now()-new Date(location.synced_at).getTime()>45*60*1000) return 'updating';
 return location.auto_enabled ? 'connected' : 'paused';
}

function needsAttention(location: Location) {
 const status = statusFor(location);
 return status === 'connect' || status === 'import' || draftHealth(location.draft_error)?.requiresAttention === true;
}

export function CustomerLocations({businesses}:{businesses:AccountBusiness[]}){
 const router=useRouter(),params=useSearchParams();
 const [data,setData]=useState<Snapshot|null>(null),[items,setItems]=useState(businesses),[query,setQuery]=useState(''),[view,setView]=useState<'attention'|'tasks'|'all'>('attention'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [connecting,setConnecting]=useState<{id:string;name:string;address:string}|null>(null);
 const [selection,setSelection]=useState<GoogleBusinessSelection|null>(null);
 const [editing,setEditing]=useState<AccountBusiness|null>(null),[adding,setAdding]=useState(false),[removing,setRemoving]=useState<Location|null>(null);
 async function refresh(){const r=await fetch('/api/account/local',{cache:'no-store'});const value=await r.json();if(!r.ok)throw Error(value.error);setData(value);}
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
 async function mutate(value:object,refreshAfter=true){const r=await fetch('/api/account/local',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const result=await r.json();if(!r.ok)throw Error(result.error);if(refreshAfter){await refresh();router.refresh();}return result;}
 async function add(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy||!selection)return;setBusy(true);setError('');try{const fields={name:selection.name,address:selection.formattedAddress,phone:'',website:''};const result=await mutate({action:'createLocation',...fields},false);setItems(old=>[...old,{id:result.id,current:fields,draft:null,version:0}]);setAdding(false);setSelection(null);setNotice('');setConnecting({id:result.id,name:fields.name,address:fields.address});router.refresh();refresh().catch(()=>setNotice('Location added. Refresh the list to see the latest details.'));}catch(e){setError(e instanceof Error?e.message:'Could not add location.');}finally{setBusy(false);}}
 async function remove(){if(!removing||busy)return;setBusy(true);setError('');try{await mutate({action:'deleteLocation',businessId:removing.id,version:removing.local_profile_version});setRemoving(null);setNotice('Location removed.');}catch(e){setError(e instanceof Error?e.message:'Could not remove location.');}finally{setBusy(false);}}
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
 return <section className="tr-locations-page"><header className="mb-5 flex items-center justify-between gap-3"><div><h1>Locations</h1><p className="mt-1 text-sm text-muted">Check location health and current reply tasks. Older imported reviews stay in review history and do not need action.</p></div><button className="tr-button-primary flex items-center gap-2" disabled={!data} onClick={()=>{setError('');setSelection(null);setAdding(true);}}><Plus size={16}/>Add location</button></header>
 {!adding&&!removing&&error&&<p role="alert" className="mb-3 text-red-700">{error} <button onClick={()=>refresh().catch(e=>setError(e.message))}>Retry</button></p>}{notice&&<p role="status" className="mb-3 text-sm text-teal-700">{notice}</p>}
 {data&&!selectedLocationId&&<div className="mb-5 grid gap-3 sm:grid-cols-3"><button type="button" className={`rounded-lg border p-4 text-left transition ${view==='attention'?'border-brand bg-brand/5':'border-line bg-white hover:border-brand/40'}`} onClick={()=>setView('attention')}><span className="block text-xs font-semibold uppercase tracking-wide text-muted">Location health</span><strong className="mt-1 block text-2xl text-ink">{summary.needsAction}</strong><span className="mt-1 block text-sm text-muted">need attention</span></button><button type="button" className={`rounded-lg border p-4 text-left transition ${view==='tasks'?'border-brand bg-brand/5':'border-line bg-white hover:border-brand/40'}`} onClick={()=>setView('tasks')}><span className="block text-xs font-semibold uppercase tracking-wide text-muted">Current reply tasks</span><strong className="mt-1 block text-2xl text-ink">{summary.tasks.toLocaleString()}</strong><span className="mt-1 block text-sm text-muted">drafts waiting for review</span></button><button type="button" className={`rounded-lg border p-4 text-left transition ${view==='all'?'border-brand bg-brand/5':'border-line bg-white hover:border-brand/40'}`} onClick={()=>setView('all')}><span className="block text-xs font-semibold uppercase tracking-wide text-muted">Connected locations</span><strong className="mt-1 block text-2xl text-ink">{summary.connected}</strong><span className="mt-1 block text-sm text-muted">connected to Google</span></button></div>}
 <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><label className="flex w-full max-w-sm items-center gap-2 rounded-md border border-line bg-white px-3"><Search size={16}/><input aria-label="Search locations" className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Search locations" value={query} onChange={e=>setQuery(e.target.value)}/></label>{data&&!selectedLocationId&&<div className="flex rounded-md border border-line bg-white p-1 text-sm"><button type="button" aria-pressed={view==='attention'} className={`rounded px-3 py-1.5 ${view==='attention'?'bg-ink text-white':'text-muted'}`} onClick={()=>setView('attention')}>Location health</button><button type="button" aria-pressed={view==='tasks'} className={`rounded px-3 py-1.5 ${view==='tasks'?'bg-ink text-white':'text-muted'}`} onClick={()=>setView('tasks')}>Reply tasks</button><button type="button" aria-pressed={view==='all'} className={`rounded px-3 py-1.5 ${view==='all'?'bg-ink text-white':'text-muted'}`} onClick={()=>setView('all')}>All locations</button></div>}</div>
 {data&&<p className="mb-3 text-xs text-muted">{selectedLocation?`Showing ${selectedLocation.business_name}`:view==='attention'?`${visible.length} ${visible.length===1?'location needs':'locations need'} attention`:view==='tasks'?`${visible.length} locations with current reply tasks`:`${visible.length} of ${data.locations.length} locations`}{summary.history>0&&<> · {summary.history.toLocaleString()} older draft{summary.history===1?'':'s'} are kept in review history</>}</p>}
 {!data&&!error&&<p role="status">Loading locations...</p>}
  <div className="tr-client-table-wrap">
   <table className="tr-client-table min-w-[760px]">
    <caption className="sr-only">Google review locations, their health, current tasks, and actions.</caption>
    <thead><tr><th>Location</th><th>Health</th><th>Reviews</th><th className="w-px">Next step</th><th className="w-px"><span className="sr-only">Manage</span></th></tr></thead>
    <tbody>
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
      const destination = taskCount > 0 ? `${reviewHref}&view=tasks` : reviewHref;
      const actionLabel = taskCount > 0 ? `Review ${taskCount} ${taskCount===1?'task':'tasks'}`
       : status === 'paused' ? 'Manage replies' : status === 'draft' || status === 'import' ? 'Open Reviews' : 'View review history';
      return <tr key={location.id} data-dashboard-row onClick={event=>activateListRow(event,()=>router.push(destination))}>
       <th scope="row">
        <div className="flex min-w-[250px] items-center gap-2">
         <span className="rounded-full bg-slate-100 p-1.5 text-slate-500"><Building2 size={16} aria-hidden="true"/></span>
         <div className="min-w-0">
          <Link className="font-semibold text-blue-700" href={`/account/profile?location=${location.id}`} onClick={event=>event.stopPropagation()}>{info?.name||location.business_name}</Link>
          <p className="mt-0.5 truncate text-xs font-normal text-muted" title={info?.address||location.address||'Address not added'}>{info?.address||location.address||'Address not added'}</p>
         </div>
         {business?.draft&&<span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700">Draft</span>}
        </div>
       </th>
       <td>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${className}`}><StatusIcon size={14} className="shrink-0" aria-hidden="true"/>{statusLabel}</span>
        {detail && <p className="mt-1 max-w-52 text-xs text-muted">{detail}</p>}
       </td>
       <td>
        <div className="whitespace-nowrap">
         <strong>{reviewCount.toLocaleString()}</strong><span className="ml-1 text-xs text-muted">review{reviewCount===1?'':'s'}</span>
         <p className={`mt-1 text-xs ${taskCount>0?'text-amber-800':'text-muted'}`}>{taskCount>0?`${taskCount} current ${taskCount===1?'task':'tasks'}`:'No current tasks'}</p>
        </div>
       </td>
       <td>
        {status==='connect'?<button type="button" className="tr-button-primary whitespace-nowrap" onClick={event=>{event.stopPropagation();setConnecting({id:location.id,name:info?.name||location.business_name,address:info?.address||location.address});}}>Connect Google</button>
         :<Link className="tr-button-ghost whitespace-nowrap" href={destination} onClick={event=>event.stopPropagation()}>{actionLabel}</Link>}
       </td>
       <td>
        <div className="flex items-center gap-1">
         <button className="tr-button-ghost" aria-label={`Edit ${location.business_name}`} disabled={!business} onClick={event=>{event.stopPropagation();setNotice('');setEditing(business||null);}}><Pencil size={14}/></button>
         <button className="tr-button-ghost" aria-label={`Delete ${location.business_name}`} onClick={event=>{event.stopPropagation();setError('');setRemoving(location);}}><Trash2 size={14}/></button>
        </div>
       </td>
      </tr>;
     })}
    </tbody>
   </table>
  </div>
 {data&&!visible.length&&<div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-muted">{query?'No matching locations.':view==='attention'&&data.locations.length?'No locations need attention.':view==='tasks'&&data.locations.length?'No current reply tasks.':'Add your first location to get started.'}</div>}
 {editing&&<BusinessEditor business={editing} onClose={()=>setEditing(null)} onSaved={(draft,version)=>{setItems(old=>old.map(b=>b.id===editing.id?{...b,draft,version}:b));setEditing(null);setNotice('Business draft saved.');}}/>}
 {adding&&modal('Add location',canAdd?<form className="tr-account-form grid gap-4" onSubmit={add}><fieldset disabled={busy}><SetupBusinessPicker label="Business name" onChange={setSelection}/></fieldset><footer className="flex justify-end gap-2"><button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>setAdding(false)}>Cancel</button><button className="tr-button-primary" disabled={busy||!selection}>{busy?'Adding...':'Add location'}</button></footer></form>:<><p className="mb-4 text-sm">All location licences are in use.</p><Link className="tr-button-primary" href="/account/packages">Manage licences</Link></>,()=>setAdding(false))}
 {connecting&&<ModalDialog labelledBy="connect-location-title" onClose={()=>setConnecting(null)}><div className="tr-card flex h-[min(620px,90dvh)] w-[min(780px,calc(100vw-32px))] flex-col overflow-hidden p-5"><header className="flex items-start justify-between gap-4"><div><h2 id="connect-location-title" data-dialog-heading tabIndex={-1}>Connect Google</h2><p className="mt-1 text-xs font-semibold">{connecting.name}</p><p className="mt-0.5 text-xs text-muted">{connecting.address}</p></div><button type="button" className="tr-button-ghost" aria-label="Close Google connection" onClick={()=>setConnecting(null)}><X size={18}/></button></header><div className="min-h-0 flex-1 overflow-y-auto"><GoogleConnectionWizard key={connecting.id} businessId={connecting.id} compact onClose={()=>setConnecting(null)} onLinked={async()=>{const id=connecting.id;setConnecting(null);router.push(`/account/reviews?location=${encodeURIComponent(id)}`);router.refresh();}}/></div></div></ModalDialog>}
 {removing&&modal('Delete location',<><p className="text-sm">Remove <strong>{removing.business_name}</strong> from Google Reviews? Imports and automation will stop. Your Google listing, stands and orders will stay unchanged.</p><footer className="mt-5 flex justify-end gap-2"><button className="tr-button-ghost" disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button><button className="tr-button-primary" disabled={busy} onClick={remove}>{busy?'Removing...':'Delete location'}</button></footer></>,()=>setRemoving(null))}
 </section>;
}
