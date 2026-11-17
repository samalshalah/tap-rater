'use client';
import {useEffect,useState,useRef} from 'react';
import {SetupBusinessPicker} from './setup-business-picker';
import type {GoogleBusinessSelection} from '@/lib/google-places-client';
import type {reviewPreviewSummary} from '@/lib/reviews-preview-analysis';
import styles from './reviews-checkout.module.css';
export type PurchasePreview={id:string;selection:GoogleBusinessSelection;connected:boolean;googleEmail:string|null;name:string|null;address:string|null;selected:boolean;complete:boolean;locked:boolean;alreadyAssigned:boolean;analysis:ReturnType<typeof reviewPreviewSummary>|null};
import type {PreviewMatch} from '@/lib/reviews-preview-match';
export function ReviewsBusinessPreview({onReady,onChange,onStage,setupHref}:{onReady:(preview:PurchasePreview)=>void;onChange:()=>void;onStage?:(stage:number)=>void;setupHref?:string}){
 const [preview,setPreview]=useState<PurchasePreview|null>(null),[selection,setSelection]=useState<GoogleBusinessSelection|null>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [matches,setMatches]=useState<PreviewMatch[]|null>(null);
 const matching=useRef(false);
 async function request(body?:unknown){const response=await fetch('/api/google-reviews/preview',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Preview unavailable. Please try again.');if('preview' in data)setPreview(data.preview);return data;}
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 useEffect(()=>{let active=true;request().then(()=>{if(new URLSearchParams(window.location.search).get('preview')==='cancelled')setError('Google connection was cancelled. You can try again.');else if(new URLSearchParams(window.location.search).get('preview')==='failed')setError('Google could not connect. Please try again.');}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoaded(true);});return()=>{active=false;};},[]);
 async function matchBusiness(){await run(async()=>{const data=await request({action:'match'});if(data.matches)setMatches(data.matches);});}
 useEffect(()=>{if(!setupHref&&preview?.connected&&!preview.selected&&!matching.current){matching.current=true;void matchBusiness();}},[preview?.id,preview?.connected,preview?.selected]);
 useEffect(()=>{
  if(setupHref||!preview?.selected||preview.complete||error||busy)return;
  const timer=window.setTimeout(()=>void run(async()=>{await request({action:'analyse'});}),1000);
  return()=>window.clearTimeout(timer);
 },[preview,busy,error]);
 useEffect(()=>{onStage?.(!preview?0:!preview.connected?1:2);},[preview?.id,preview?.connected,onStage]);
 const analysis=preview?.analysis;
 if(!loaded)return <p role="status">Loading your business preview…</p>;
 if(setupHref&&preview)return <div className={styles.preview}><h2>Continue with your business</h2><div className={styles.selectedBusiness}><strong>{preview.name||preview.selection.name}</strong><span>{preview.address||preview.selection.formattedAddress}</span></div><p className={styles.intro}>Your progress is saved. Continue to your review preview.</p><a className={`tr-button-primary ${styles.submit}`} href={setupHref}>Continue <span aria-hidden="true">&rarr;</span></a><button type="button" className={styles.textButton} onClick={()=>{setPreview(null);setSelection(null);onChange();}}>Find a different business</button></div>;
 return <div className={styles.preview}>
  <h2>{!preview?'Find your business':!preview.connected?'Connect your Google account':!preview.selected?(matches?'Confirm your business':'Finding your business'):'Your review snapshot'}</h2>
  {!preview&&<><p className={styles.intro}>See which reviews need a reply before you subscribe.</p><SetupBusinessPicker onChange={setSelection}/><button type="button" className={`tr-button-primary ${styles.submit}`} disabled={!selection||busy} onClick={()=>void run(async()=>{if(selection){await request({action:'start',selection:{placeId:selection.placeId,name:selection.name,formattedAddress:selection.formattedAddress}});if(setupHref)window.location.assign(setupHref);}})}>Continue with this business <span aria-hidden="true">→</span></button></>}
  {preview&&<div className={styles.selectedBusiness}><strong>{preview.name||preview.selection.name}</strong><span>{preview.address||preview.selection.formattedAddress}</span></div>}
  {preview&&!preview.connected&&<><p className={styles.intro}>Connect the Google account that manages this business to see how many reviews have no reply.</p><p className={styles.smallPrint}>This preview only reads your reviews. Google’s permission screen also covers management access; Tap Rater will not post replies or change your profile.</p><button type="button" className={`tr-button-primary ${styles.submit}`} disabled={busy} onClick={()=>void run(async()=>{const data=await request({action:'connect'});window.location.assign(data.url);})}>Connect Google <span aria-hidden="true">→</span></button><p className={styles.paymentNote}>No payment required for the preview</p></>}
  {preview?.connected&&!preview.selected&&<div className={styles.fields}>
   <p className={styles.smallPrint}>Connected as {preview.googleEmail}.</p>
   {matches===null&&!error&&<p role="status">Finding your selected business and preparing your review analysis...</p>}
   {matches?.length===0&&<><p className={styles.intro}>We could not find a matching location accessible to this Google account. Connect the Google account that manages {preview.selection.name}.</p><button type="button" className="tr-button-primary" disabled={busy} onClick={()=>void run(async()=>{const data=await request({action:'connect'});window.location.assign(data.url);})}>Connect a different Google account</button></>}
   {matches&&matches.length>1&&<><p className={styles.intro}>Google returned more than one matching profile. Which one should we analyse?</p>{matches.map(m=><button type="button" key={m.location} className="tr-button-ghost" disabled={busy} onClick={()=>void run(async()=>{await request({action:'select',account:m.account,location:m.location});})}>{m.title} - {m.address}</button>)}</>}
   {error&&<button type="button" className="tr-button-ghost" disabled={busy} onClick={()=>void matchBusiness()}>Try finding my business again</button>}
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
  {preview&&<button type="button" className={styles.textButton} disabled={busy} onClick={()=>{setPreview(null);setSelection(null);setMatches(null);matching.current=false;setError('');onChange();}}>Start with another business</button>}
 </div>;
}
