"use client";
import {WorkspaceDetails} from './workspace-details';
import {useState,useId,useMemo,type FormEvent} from 'react';
import {Globe,MapPin,Pencil,Plus,Info,Search} from 'lucide-react';

import {buildDirectoryRows,filterDirectoryRows,summarizeDirectoryRows,labels,empty,type Edit,type DirectoryLocation,type DirectoryRecord} from './directory-model';
export type {DirectoryLocation,DirectoryRecord} from './directory-model';
import {DirectoryTable} from './directory-table';
import {DirectoryProfileDialog} from './directory-profile-dialog';
import {DirectoryCheckDialog} from './directory-check-dialog';
import {DirectoryDetailDialog} from './directory-detail-dialog';
export function DirectoryManager({locations,records,save,busy}:{locations:DirectoryLocation[];records:DirectoryRecord[];save:(body:unknown)=>Promise<unknown>;busy:boolean}){
 const [tab,setTab]=useState<'listings'|'corrections'|'duplicates'>('listings'),[detail,setDetail]=useState<DirectoryRecord&{location:DirectoryLocation}|null>(null);
 const [filter,setFilter]=useState(''),[query,setQuery]=useState(''),[edit,setEdit]=useState<Edit|null>(null),[profile,setProfile]=useState<DirectoryLocation|null>(null);
 const rows=useMemo(()=>buildDirectoryRows(locations,records),[locations,records]);
 const shown=useMemo(()=>filterDirectoryRows(rows,tab,filter,query),[rows,tab,filter,query]);
 const {checked,counts}=useMemo(()=>summarizeDirectoryRows(rows),[rows]);
 function start(d:Edit){setEdit({...d});setProfile(null);}
 async function saveRecord(e:FormEvent){e.preventDefault();if(!edit)return;const result=await save({action:'saveListing',businessId:edit.business_id,directory:edit.directory,status:edit.status,listingUrl:edit.listing_url,listedName:edit.listed_name,listedAddress:edit.listed_address,listedPhone:edit.listed_phone,listedWebsite:edit.listed_website,notes:edit.notes,checked:Boolean(edit.checked_at),version:edit.version});if(result)setEdit(null);}
 async function saveProfile(e:FormEvent){e.preventDefault();if(!profile)return;const result=await save({action:'updateLocation',businessId:profile.id,name:profile.business_name,address:profile.address||'',phone:profile.phone||'',website:profile.website_url||'',category:profile.local_category,description:profile.local_description,hours:profile.local_hours,version:profile.local_profile_version});if(result)setProfile(null);}
 return <div className="tr-marketing-feature tr-directory-feature">
  <div className="tr-listing-profiles">{locations.map(l=>{const fields=[l.business_name,l.address,l.phone,l.website_url,l.local_category,l.local_description,l.local_hours],complete=fields.filter(v=>v?.trim()).length;return <article key={l.id} className="tr-listing-profile"><div className="tr-listing-profile-title"><span className="tr-directory-icon"><Globe size={20}/></span><div><h2>{locations.length===1?'Directory profile':l.business_name}</h2>{locations.length>1&&<p><MapPin size={13}/>{l.address||'Address not set'}</p>}</div>{l.connected?<a className="tr-button-ghost" href={"/account/profile?location="+encodeURIComponent(l.id)}><Pencil size={13}/>Business profile</a>:<button className="tr-button-ghost" onClick={()=>{setProfile({...l});setEdit(null);}}><Pencil size={13}/>Edit business info</button>}</div><footer><span>{l.local_category||'Category not set'}</span><div><progress value={complete} max={7} aria-label={l.business_name+' profile completeness'}/><span>{Math.round(complete/7*100)}% complete</span><ListingInfo label="Profile completeness">Based on the seven saved fields: name, address, phone, website, category, description and hours. This is profile completeness, not directory distribution progress.</ListingInfo></div><button onClick={()=>start({...empty,business_id:l.id})}><Plus size={13}/>Add directory</button></footer></article>})}</div>
  <nav className="tr-listing-tabs" aria-label="Directory views">{(['listings','corrections','duplicates'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='listings'?'Listings':t==='corrections'?'Corrections':'Duplicates'}</button>)}</nav>
  <section className="tr-listing-summary" aria-label="Directory status summary"><div className="tr-listing-summary-total"><strong>{rows.length}</strong><span>Directory records</span><ListingInfo label="Directory coverage">Directories tracked for the selected location. A record does not mean a listing is connected.</ListingInfo></div><div className="tr-listing-status-counts">{Object.entries(labels).map(([status,label])=><button key={status} onClick={()=>{setTab('listings');setFilter(status);}}><span className={'tr-listing-dot status-'+status}/><span>{label}</span><strong>{counts[status]||0}</strong></button>)}</div><div className="tr-listing-summary-note"><WorkspaceDetails label={`${checked} of ${rows.length} checked`} title="Directory tracking details"><p>Manual tracking: statuses reflect manual checks. Automatic directory updates are not available yet.</p><p>Approved corrections remain drafts. Changes stay as drafts for approval.</p></WorkspaceDetails></div></section>
  {profile&&<DirectoryProfileDialog profile={profile} setProfile={setProfile} busy={busy} saveProfile={saveProfile}/>}
  {tab!=='duplicates'&&<div className="tr-listing-toolbar"><div className="tr-listing-filters" aria-label="Listing status filters">{[['','All'],...Object.entries(labels)].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><label><Search size={14}/><input aria-label="Search directories or locations" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search directories"/></label></div>}
  {edit&&<DirectoryCheckDialog edit={edit} setEdit={setEdit} busy={busy} saveRecord={saveRecord} locations={locations}/>}
  <DirectoryTable tab={tab} shown={shown} locationCount={locations.length} setDetail={setDetail}/>
  {detail&&<DirectoryDetailDialog detail={detail} setDetail={setDetail} busy={busy} start={start} save={save}/>}

 </div>;
}

function ListingInfo({label,children}:{label:string;children:React.ReactNode}){const id=useId(),[open,setOpen]=useState(false);return <span className={'tr-listing-info'+(open?' is-open':'')}><button type="button" aria-label={label} aria-describedby={id} aria-expanded={open} onClick={()=>setOpen(!open)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.currentTarget.blur();}}}><Info size={13}/></button><span id={id} role="tooltip">{children}</span></span>;}
