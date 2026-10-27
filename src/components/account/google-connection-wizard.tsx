"use client";
import {DialogTabPanel} from '@/components/ui/dialog-tab-panel';
import {useEffect,useRef,useState} from 'react';
import {GoogleLocationPicker} from './google-location-picker';
import {useGoogleLocationSearch} from './google-location-search';
import {discoverGoogleLocations,type GoogleLocationChoice} from '@/lib/google-business/location-discovery';
type Setup={connection:{email:string}|null;businesses:{id:string;business_name:string;address?:string}[]};
export function GoogleConnectionWizard({onLinked,businessId,compact=false}:{onLinked:()=>Promise<void>;businessId?:string;compact?:boolean}){
 const [setup,setSetup]=useState<Setup|null>(null),[locations,setLocations]=useState<GoogleLocationChoice[]>([]),[account,setAccount]=useState(''),[location,setLocation]=useState(''),[business,setBusiness]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [filter,setFilter]=useState('');
 const [connectionTab,setConnectionTab]=useState<'google'|'manual'>('google');
 const [pickerOpen,setPickerOpen]=useState(false),[disconnectPrompt,setDisconnectPrompt]=useState(false);
 const picker=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const modal=picker.current;if(pickerOpen&&!modal?.open)modal?.showModal();else if(!pickerOpen&&modal?.open)modal.close();return()=>{if(modal?.open)modal.close();};},[pickerOpen]);
 const endpoint='/api/account/google-business';
 const businessTarget=businessId||business;
 useEffect(()=>{let active=true;const outcome=new URLSearchParams(window.location.search).get('connection');if(outcome==='failed'||outcome==='cancelled')setError(outcome==='cancelled'?'Google connection was cancelled. You can try again.':'Google connection did not finish. Reconnect and grant Business Profile access.');fetch(endpoint+((businessId||business)?'?businessId='+encodeURIComponent(businessId||business):''),{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);if(active){setSetup(d);if(businessId&&d.businesses.some((b:{id:string})=>b.id===businessId))setBusiness(businessId);else if(d.businesses.length===1)setBusiness(d.businesses[0].id);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[businessTarget]);
 async function post(body:unknown){if(!businessId&&!business)throw Error('Choose a business first.');const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body as object,businessId:businessId||business})});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}
 useEffect(()=>{
  if(!setup?.connection)return;
  let active=true;setPickerOpen(true);setBusy(true);setError('');setLocations([]);setLocation('');setAccount('');setConfirmed(false);
  discoverGoogleLocations(post).then(rows=>{if(active){setLocations(rows);if(!rows.length)setError('No businesses found. Connect the Google account that owns or manages your business.');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;};
 },[setup]);
 async function run(action:'connect'|'accounts'|'bind'|'disconnect'){
  setBusy(true);setError('');try{
   if(action==='connect'){const d=await post({action});window.location.assign(d.authorizationUrl);return;}
   if(action==='disconnect'){await post({action,confirm:true});setPickerOpen(false);setDisconnectPrompt(false);setLocations([]);setLocation('');setAccount('');setConfirmed(false);setSetup(current=>current?{...current,connection:null}:current);return;}
   if(action==='bind'){if(!confirmed||!location||!business||!locations.some(l=>l.name===location&&l.account===account))throw Error('Choose and confirm one business first.');await post({action,businessId:business,account,location,confirmAssignment:true});setPickerOpen(false);setLocations([]);setConfirmed(false);await onLinked();return;}
   setPickerOpen(true);setLocation('');setAccount('');setConfirmed(false);setLocations([]);
   const rows=await discoverGoogleLocations(post);setLocations(rows);if(!rows.length)setError('No businesses found. Connect the Google account that owns or manages your business.');
  }catch(e){setError(e instanceof Error?e.message:'Connection failed.');}finally{setBusy(false);}
 }
 const {address,visibleLocations,selected}=useGoogleLocationSearch(locations,filter,location);
 return <section aria-label="Connect your Google business" className="my-5 rounded-xl border border-line p-5"><div role="tablist" aria-label="Connection method" className="mb-4 flex border-b border-line">{([['google','Connect Google'],['manual','Manual setup']] as const).map(([id,label])=><button key={id} id={`connection-tab-${id}`} type="button" role="tab" aria-selected={connectionTab===id} aria-controls={`connection-panel-${id}`} tabIndex={connectionTab===id?0:-1} className={`border-b-2 px-4 py-2 text-sm font-medium ${connectionTab===id?'border-teal-600 text-teal-700':'border-transparent text-muted'}`} onClick={()=>setConnectionTab(id)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'google':e.key==='End'?'manual':connectionTab==='google'?'manual':'google';setConnectionTab(next);document.getElementById(`connection-tab-${next}`)?.focus();}}}>{label}</button>)}</div>
 <div className="grid"><DialogTabPanel active={connectionTab==='google'} id="connection-panel-google" labelledBy="connection-tab-google"><p className="mb-4 text-sm">Sign in to Google, then choose the business you want to connect.</p>
 <fieldset disabled={busy} className="space-y-4">
 {setup?.connection?<p>Google account authorized: <strong>{setup.connection.email}</strong></p>:<p>Sign in with the Google account that manages your business.</p>}
 {!businessId&&<label className="block text-sm">Business<select className="mt-1 w-full rounded border border-line p-2" value={business} onChange={e=>{setSetup(null);setPickerOpen(false);setBusiness(e.target.value);}}><option value="">Choose business</option>{setup?.businesses.map(b=><option key={b.id} value={b.id}>{b.business_name}</option>)}</select></label>}
 <button className="tr-button-primary" disabled={!businessId&&!business} onClick={()=>run('connect')}>{setup?.connection?'Connect another Google account':'Connect Google'}</button>
 {setup?.connection&&<><button type="button" className="tr-button-ghost ml-3" onClick={()=>{setDisconnectPrompt(true);setPickerOpen(false);}}>Disconnect Google</button>
 {disconnectPrompt&&<div className="rounded border border-line p-3 text-sm"><p>Disconnect {setup.connection.email} for this business? Its review imports will stop. Saved reviews and drafts remain.</p><button type="button" className="tr-button-primary mt-2" onClick={()=>run('disconnect')}>Confirm disconnect</button><button type="button" className="tr-button-ghost ml-2" onClick={()=>setDisconnectPrompt(false)}>Cancel</button></div>}
 <button type="button" className="tr-button-ghost ml-3" onClick={()=>setPickerOpen(true)}>Choose location</button><button className="tr-button-ghost ml-3" onClick={()=>run('accounts')}>Refresh business list</button>
 <GoogleLocationPicker picker={picker} email={setup.connection.email} businesses={setup.businesses} locations={locations} visibleLocations={visibleLocations} selected={selected} address={address} filter={filter} setFilter={setFilter} location={location} setLocation={setLocation} setAccount={setAccount} confirmed={confirmed} setConfirmed={setConfirmed} business={business} setBusiness={setBusiness} compact={compact} businessId={businessId} busy={busy} error={error} setPickerOpen={setPickerOpen} run={run}/>
 {setup.businesses.length===0&&<p>Add a location in Locations & Listings before connecting it to Google.</p>}</>}
 </fieldset>{busy&&<p role="status" className="mt-3">Checking Google…</p>}{error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}</DialogTabPanel><DialogTabPanel active={connectionTab==='manual'} id="connection-panel-manual" labelledBy="connection-tab-manual"><div className="space-y-4 text-sm"><h3 className="font-semibold">Invite Tap Rater as a manager</h3><p>You keep ownership of your Google Business Profile.</p><ol className="list-decimal space-y-3 pl-5"><li>Open your business in Google Business Profile.</li><li>Go to <strong>Business Profile settings → People and access</strong>.</li><li>Add <strong>admin@taprater.com</strong> as a <strong>Manager</strong> and send the invitation.</li></ol><a className="tr-button-ghost" href="https://business.google.com/" target="_blank" rel="noopener noreferrer">Open Google Business Profile</a><p className="text-muted">After sending the invitation, contact <a href="mailto:support@taprater.com" className="underline">support@taprater.com</a> to finish setup. Reviews will import once your selected business is connected.</p><p className="text-xs text-muted">A manager can edit your profile and manage reviews. You can remove access in Google’s People and access settings.</p></div></DialogTabPanel></div></section>;
}
