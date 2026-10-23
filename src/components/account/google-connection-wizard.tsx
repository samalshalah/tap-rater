"use client";
import {useEffect,useState} from 'react';
import {discoverGoogleLocations,type GoogleLocationChoice} from '@/lib/google-business/location-discovery';
type Setup={connection:{email:string}|null;businesses:{id:string;business_name:string;address?:string}[]};
export function GoogleConnectionWizard({onLinked,businessId,compact=false}:{onLinked:()=>Promise<void>;businessId?:string;compact?:boolean}){
 const [setup,setSetup]=useState<Setup|null>(null),[locations,setLocations]=useState<GoogleLocationChoice[]>([]),[account,setAccount]=useState(''),[location,setLocation]=useState(''),[business,setBusiness]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const endpoint='/api/account/google-business';
 useEffect(()=>{let active=true;const outcome=new URLSearchParams(window.location.search).get('connection');if(outcome==='failed'||outcome==='cancelled')setError(outcome==='cancelled'?'Google connection was cancelled. You can try again.':'Google connection did not finish. Reconnect and grant Business Profile access.');fetch(endpoint,{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);if(active){setSetup(d);if(businessId&&d.businesses.some((b:{id:string})=>b.id===businessId))setBusiness(businessId);else if(d.businesses.length===1)setBusiness(d.businesses[0].id);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[businessId]);
 async function post(body:unknown){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}
 useEffect(()=>{
  if(!setup?.connection)return;
  let active=true;setBusy(true);setError('');setLocations([]);setLocation('');setAccount('');setConfirmed(false);
  discoverGoogleLocations(post).then(rows=>{if(active){setLocations(rows);if(!rows.length)setError('No businesses found. Connect the Google account that owns or manages your business.');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;};
 },[setup]);
 async function run(action:'connect'|'accounts'|'bind'){
  setBusy(true);setError('');try{
   if(action==='connect'){const d=await post({action});window.location.assign(d.authorizationUrl);return;}
   if(action==='bind'){if(!confirmed||!location||!business||!locations.some(l=>l.name===location&&l.account===account))throw Error('Choose and confirm one business first.');await post({action,businessId:business,account,location,confirmAssignment:true});setLocations([]);setConfirmed(false);await onLinked();return;}
   setLocation('');setAccount('');setConfirmed(false);setLocations([]);
   const rows=await discoverGoogleLocations(post);setLocations(rows);if(!rows.length)setError('No businesses found. Connect the Google account that owns or manages your business.');
  }catch(e){setError(e instanceof Error?e.message:'Connection failed.');}finally{setBusy(false);}
 }
 const selected=locations.find(l=>l.name===location);
 return <section aria-label="Connect your Google business" className="my-5 rounded-xl border border-line p-5"><h3 className="text-xl font-semibold">Connect your Google business</h3><p className="mt-2 text-sm">Choose one business from your Google account. Only that location’s profile and reviews will be imported. Other businesses remain unconnected.</p>
 {!compact&&<ol className="my-4 flex flex-wrap gap-4 text-sm"><li>1. Invite your manager</li><li>2. Connect Google</li><li>3. Choose business and import</li></ol>}
 <details className="my-4 rounded-lg border border-line p-4"><summary className="cursor-pointer font-semibold">Invite Tap Rater as your business manager</summary><p className="mt-3 text-sm">Use <strong>admin@taprater.com</strong> for Tap Rater’s business management access. You keep ownership of your Google Business Profile.</p><ol className="my-3 list-decimal space-y-2 pl-5 text-sm"><li>Open your Google Business Profile using its owner account.</li><li>Choose Business Profile settings, then People and access.</li><li>Select Add, enter <strong>admin@taprater.com</strong>, choose <strong>Manager</strong>, and send the invitation.</li></ol><a className="tr-button-ghost" href="https://business.google.com/" target="_blank" rel="noopener noreferrer">Open Google Business Profile</a><p className="mt-3 text-sm">The invitation stays pending until Tap Rater accepts it. A Manager can edit your profile and manage reviews; you can remove that access in People and access. Never share your Google password.</p><p className="mt-2 text-sm">This invitation is separate from connecting below. Connect with your own Google account to authorize Tap Rater and select the location for this workspace. Connecting does not send a manager invitation. Replies in Tap Rater remain drafts, including after you approve them.</p></details>
 <p className="my-3 text-sm">Stay in this browser while connecting. Choose your business’s Google account when prompted.</p>
 {!compact&&<p className="my-3 text-sm">Have multiple locations? <a className="underline" href="/account/local">Add each location to your account</a>, then connect each Google location to its matching Tap Rater location.</p>}
 <fieldset disabled={busy} className="space-y-4">
 {setup?.connection?<p>Google account authorized: <strong>{setup.connection.email}</strong></p>:<p>Sign in with the Google account that manages your business.</p>}
 <button className="tr-button-primary" onClick={()=>run('connect')}>{setup?.connection?'Reconnect Google':'Connect Google'}</button>
 {setup?.connection&&<><button className="tr-button-ghost ml-3" onClick={()=>run('accounts')}>Refresh business list</button>
 {locations.length>0&&<><label className="block">Choose one business ({locations.length} available) <select className="w-full rounded border p-2" value={location} onChange={e=>{setLocation(e.target.value);setAccount(locations.find(l=>l.name===e.target.value)?.account||'');setConfirmed(false);}}><option value="">Choose your location</option>{locations.map(l=><option key={l.name} value={l.name}>{l.title||l.name} — {[...(l.storefrontAddress?.addressLines||[]),l.storefrontAddress?.locality,l.storefrontAddress?.administrativeArea,l.storefrontAddress?.postalCode].filter(Boolean).join(', ')||'Service-area business'}</option>)}</select></label>
 {!compact&&<label className="block">Tap Rater location <select className="rounded border p-2" value={business} onChange={e=>{setBusiness(e.target.value);setConfirmed(false);}}><option value="">Choose workspace</option>{setup.businesses.map(b=><option key={b.id} value={b.id}>{b.business_name}{b.address?' · '+b.address:''}</option>)}</select></label>}
 <label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I am authorized to connect {selected?.title||'this business'} to the selected workspace and allow Tap Rater to use AI to process its review text and ratings to prepare reply drafts for my approval. Nothing will be published.</label>
 <button className="tr-button-primary" disabled={!location||!business||!confirmed} onClick={()=>run('bind')}>Connect selected business and import reviews</button></>}
 {setup.businesses.length===0&&<p>Add a location in Locations & Listings before connecting it to Google.</p>}</>}
 </fieldset>{busy&&<p role="status" className="mt-3">Checking Google…</p>}{error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}</section>;
}
