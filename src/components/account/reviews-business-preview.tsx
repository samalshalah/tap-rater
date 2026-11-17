'use client';
import {useEffect,useState} from 'react';
import {SetupBusinessPicker} from './setup-business-picker';
import type {GoogleBusinessSelection} from '@/lib/google-places-client';
import type {reviewPreviewSummary} from '@/lib/reviews-preview-analysis';
import styles from './reviews-checkout.module.css';
export type PurchasePreview={id:string;selection:GoogleBusinessSelection;connected:boolean;googleEmail:string|null;name:string|null;address:string|null;selected:boolean;complete:boolean;locked:boolean;alreadyAssigned:boolean;analysis:ReturnType<typeof reviewPreviewSummary>|null};
type Account={name:string;accountName?:string;type?:string};
type Location={name:string;title?:string;storefrontAddress?:{addressLines?:string[];locality?:string;administrativeArea?:string;postalCode?:string}};
export function ReviewsBusinessPreview({onReady,onChange}:{onReady:(preview:PurchasePreview)=>void;onChange:()=>void}){
 const [preview,setPreview]=useState<PurchasePreview|null>(null),[selection,setSelection]=useState<GoogleBusinessSelection|null>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [accounts,setAccounts]=useState<Account[]>([]),[account,setAccount]=useState(''),[accountPage,setAccountPage]=useState(''),[parentAccount,setParentAccount]=useState('');
 const [locations,setLocations]=useState<Location[]>([]),[location,setLocation]=useState(''),[locationPage,setLocationPage]=useState('');
 async function request(body?:unknown){const response=await fetch('/api/google-reviews/preview',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Preview unavailable. Please try again.');if('preview' in data)setPreview(data.preview);return data;}
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 useEffect(()=>{let active=true;request().then(()=>{if(new URLSearchParams(window.location.search).get('preview')==='cancelled')setError('Google connection was cancelled. You can try again.');else if(new URLSearchParams(window.location.search).get('preview')==='failed')setError('Google could not connect. Please try again.');}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoaded(true);});return()=>{active=false;};},[]);
 async function loadAccounts(token='',parent=''){const data=await request({action:'accounts',...(token?{pageToken:token}:{}),...(parent?{parentAccount:parent}:{})});setAccounts(old=>token?[...old,...data.accounts]:data.accounts);setAccountPage(data.nextPageToken||'');setParentAccount(parent);}
 useEffect(()=>{if(preview?.connected&&!preview.selected&&!accounts.length&&!error&&!busy)void run(()=>loadAccounts());},[preview?.connected,preview?.selected]);
 useEffect(()=>{
  if(!preview?.selected||preview.complete||error||busy)return;
  const timer=window.setTimeout(()=>void run(async()=>{await request({action:'analyse'});}),1000);
  return()=>window.clearTimeout(timer);
 },[preview,busy,error]);
 const analysis=preview?.analysis;
 if(!loaded)return <p role="status">Loading your business preview…</p>;
 return <div className={styles.preview}>
  <ol className={styles.steps} aria-label="Subscription steps">{['Business','Review analysis','Subscribe'].map((s,i)=><li key={s} aria-current={(preview?.selected?1:0)===i?'step':undefined}>{i+1}. {s}</li>)}</ol>
  <h2>{!preview?'Find your business':!preview.connected?'Connect your Google account':!preview.selected?'Choose your Google location':'Your review snapshot'}</h2>
  {!preview&&<><p className={styles.intro}>See which reviews need a reply before you subscribe.</p><SetupBusinessPicker onChange={setSelection}/><button type="button" className={`tr-button-primary ${styles.submit}`} disabled={!selection||busy} onClick={()=>void run(async()=>{if(selection)await request({action:'start',selection:{placeId:selection.placeId,name:selection.name,formattedAddress:selection.formattedAddress}});})}>Continue with this business <span aria-hidden="true">→</span></button></>}
  {preview&&<div className={styles.selectedBusiness}><strong>{preview.name||preview.selection.name}</strong><span>{preview.address||preview.selection.formattedAddress}</span></div>}
  {preview&&!preview.connected&&<><p className={styles.intro}>Connect the Google account that manages this business to see how many reviews have no reply.</p><p className={styles.smallPrint}>This preview only reads your reviews. Google’s permission screen also covers management access; Tap Rater will not post replies or change your profile.</p><button type="button" className={`tr-button-primary ${styles.submit}`} disabled={busy} onClick={()=>void run(async()=>{const data=await request({action:'connect'});window.location.assign(data.url);})}>Connect Google <span aria-hidden="true">→</span></button><p className={styles.paymentNote}>No payment required for the preview</p></>}
  {preview?.connected&&!preview.selected&&<div className={styles.fields}>
   <p className={styles.smallPrint}>Connected as {preview.googleEmail}. Select the same business you found above.</p>
   <label>Google account<select value={account} disabled={busy} onChange={e=>{const value=e.target.value;setAccount(value);setLocation('');setLocations([]);if(value)void run(async()=>{const data=await request({action:'locations',account:value});setLocations(data.locations);setLocationPage(data.nextPageToken||'');});}}><option value="">Choose an account</option>{accounts.map(a=><option key={a.name} value={a.name}>{a.accountName||a.name}</option>)}</select></label>
   {accountPage&&<button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>void run(()=>loadAccounts(accountPage,parentAccount))}>More accounts</button>}
   {account&&<button type="button" className={styles.textButton} disabled={busy} onClick={()=>void run(async()=>{await loadAccounts('',account);setAccount('');setLocations([]);})}>Look inside this account’s business groups</button>}
   {parentAccount&&<button type="button" className={styles.textButton} disabled={busy} onClick={()=>void run(async()=>{await loadAccounts();setAccount('');setLocations([]);})}>Back to all Google accounts</button>}
   {account&&<label>Business location<select value={location} disabled={busy} onChange={e=>setLocation(e.target.value)}><option value="">Choose a location</option>{locations.map(l=><option key={l.name} value={l.name}>{l.title||l.name} — {[...(l.storefrontAddress?.addressLines||[]),l.storefrontAddress?.locality].filter(Boolean).join(', ')}</option>)}</select></label>}
   {account&&!busy&&!locations.length&&<p className={styles.smallPrint}>No locations in this account. Try its business groups or another Google account.</p>}
   {locationPage&&<button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>void run(async()=>{const data=await request({action:'locations',account,pageToken:locationPage});setLocations(old=>[...old,...data.locations]);setLocationPage(data.nextPageToken||'');})}>More locations</button>}
   <button type="button" className={`tr-button-primary ${styles.submit}`} disabled={!location||busy} onClick={()=>void run(async()=>{await request({action:'select',account,location});})}>Analyse my reviews <span aria-hidden="true">→</span></button>
  </div>}
  {preview?.selected&&analysis&&<>
   {!preview.complete?<p role="status" className={styles.intro}>Analysing reviews… {analysis.reviewCount}{analysis.total!==null?` of ${analysis.total}`:''} checked. Your results will appear when all pages finish.</p>:<>
    <div className={styles.metrics}><div><strong>{analysis.reviewCount.toLocaleString()}</strong><span>Reviews analysed</span></div><div><strong>{analysis.unanswered.toLocaleString()}</strong><span>Without a reply</span></div></div>
    <table className={styles.analysisTable}><caption>Reviews without a reply, by star rating</caption><thead><tr><th scope="col">Rating</th><th scope="col">No reply</th><th scope="col">Total</th></tr></thead><tbody>{analysis.byStars.map(r=><tr key={r.stars}><th scope="row">{r.stars} {r.stars===1?'star':'stars'}</th><td>{r.unanswered}</td><td>{r.total}</td></tr>)}</tbody></table>
    {analysis.unknownStars>0&&<p className={styles.smallPrint}>{analysis.unknownStars} unanswered reviews have no star rating supplied by Google.</p>}
    <p className={styles.smallPrint}>Based on reviews returned by Google for this preview.{analysis.total!==null&&analysis.total!==analysis.reviewCount?' Google’s headline total differs from the reviews available through its API.':''}</p>
    {preview.alreadyAssigned?<p role="status" className={styles.intro}>This location already has a Tap Rater connection. <a href="/account/reviews">Open your existing account</a> or <a href="/contact-us">contact us</a>. You don’t need another subscription.</p>:<><p className={styles.intro}>{analysis.unanswered?'Turn unanswered reviews into thoughtful reply drafts.':'You’re up to date. Keep future reviews organised and prepare replies as they arrive.'}</p><button type="button" className={`tr-button-primary ${styles.submit}`} onClick={()=>onReady(preview)}>Continue to your plan <span aria-hidden="true">→</span></button></>}
   </>}
  </>}
  {error&&<div role="alert" className={styles.error}><p>{error}</p>{preview?.selected&&!preview.complete&&<button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>setError('')}>Resume analysis</button>}</div>}
  {busy&&<p role="status" className={styles.smallPrint}>Please wait…</p>}
  {preview&&<button type="button" className={styles.textButton} disabled={busy} onClick={()=>{setPreview(null);setSelection(null);setAccounts([]);setAccount('');setLocations([]);setLocation('');setError('');onChange();}}>Start with another business</button>}
 </div>;
}
