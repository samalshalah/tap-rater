"use client";
import { useEffect,useState } from 'react';
import { replyStyles,type ReplyStyle,type ReplySuggestions } from '@/lib/review-ai-options';
import type { Post,Row } from './google-live-review-types';
import { ReviewAvatar,ReviewStars,reviewDate,reviewerName } from './google-live-review-display';
export function LiveCard({review,post,refresh,canPublish,aiAllowed,active,onState}:{review:Row;post:Post;refresh:()=>Promise<void>;canPublish:boolean;aiAllowed:boolean;active:boolean;onState?:(dirty:boolean,busy:boolean)=>void}){
 const [draft,setDraft]=useState(review.draft),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[suggestions,setSuggestions]=useState<ReplySuggestions|null>(null);
 const dirty=draft.trim()!==review.draft,unresolved=['publishing','uncertain'].includes(review.publish_state);
 useEffect(()=>{onState?.(dirty,busy);},[dirty,busy,onState]);
 async function action(kind:'save'|'suggest'|'publish'|'reconcile'|'approve'|'spam'){
  if(kind==='publish'&&!window.confirm('Publish this exact saved reply publicly on Google? It will replace the current business reply if one exists.'))return;
  setBusy(true);setMessage('');
  try{
   const result=await post({action:kind,id:review.id,...(kind==='spam'?{spam:!review.suspected_spam,version:review.version}:kind==='save'?{draft,version:review.version}:kind==='publish'?{version:review.version,confirmPublicReply:true}:kind==='approve'?{version:review.version}:{})});
   if(kind==='suggest')setSuggestions(result.suggestions as ReplySuggestions);
   else{await refresh();setMessage(kind==='reconcile'?(result.published?'Google confirms this reply is published.':result.resolved?'Result refreshed. Review the current Google reply before deciding whether to publish again.':'The result is still uncertain. Wait five minutes before checking again.'):'Saved successfully.');}
  }catch(e){setMessage(e instanceof Error?e.message:'Request failed.');if(kind==='publish')await refresh();}finally{setBusy(false);}
 }
 return <article className="tr-review-detail">
  <div className="tr-review-identity"><ReviewAvatar name={reviewerName(review)}/><img src="/brand/google-g.png" alt="Google" width="20" height="20"/><div><strong>{reviewerName(review)}</strong><time>{reviewDate(review)}</time></div><ReviewStars rating={review.data.starRating}/></div>
  <div className="my-3 flex flex-wrap items-center gap-3"><button className="tr-button-ghost" disabled={busy||dirty||unresolved||!active} onClick={()=>action('spam')}>{review.suspected_spam?'Remove spam flag':'Mark as suspected spam'}</button><span className="text-xs text-muted">Private flag only. Does not report or remove the review on Google.</span></div>{review.suspected_spam&&<p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">Suspected spam · AI drafting and approval are paused. Your saved draft is preserved.</p>}
  <section className="tr-review-detail-section"><h3>Review</h3><p>{review.data.comment||'Rating only; no written review.'}</p></section>
  <section className="tr-review-detail-section"><h3>Existing reply</h3><div className="tr-existing-reply">{review.data.reviewReply?.comment||<em>No reply yet.</em>}</div></section>
  <section className="tr-review-detail-section tr-draft-editor"><label htmlFor={'live-'+review.id}>Your reply (draft)</label><textarea id={'live-'+review.id} maxLength={4000} value={draft} disabled={busy||unresolved||!active||review.suspected_spam} onChange={e=>setDraft(e.target.value)}/><span className="tr-draft-count">{draft.length.toLocaleString()}/4,000</span></section>
  <details className="tr-ai-reply-tools"><summary>AI reply suggestions</summary><button className="tr-button-ghost mt-2" disabled={busy||!aiAllowed||!active||unresolved||review.suspected_spam} onClick={()=>action('suggest')}>Suggest four replies with AI</button>{!aiAllowed&&<p>Enable AI in this location’s draft settings first.</p>}{suggestions&&<div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(replyStyles).map(([key,label])=><div className="rounded border p-3" key={key}><strong>{label}</strong><p>{suggestions[key as ReplyStyle]}</p><button className="underline" disabled={busy||unresolved} onClick={()=>{if(!draft.trim()||window.confirm('Replace the unsaved reply text with this suggestion?'))setDraft(suggestions[key as ReplyStyle]);}}>Use {label}</button></div>)}</div>}</details>
  {review.scheduled_at&&<p className="text-sm">Scheduled for {new Date(review.scheduled_at).toLocaleString()} <button className="tr-button-ghost" disabled={busy} onClick={async()=>{await post({action:"cancelScheduled",id:review.id});await refresh();}}>Cancel scheduled reply</button></p>}<div className="tr-review-detail-actions"><button className="tr-button-ghost" disabled={busy||unresolved||!active||review.suspected_spam} onClick={()=>action('save')}>Save draft</button><button className="tr-button-primary" disabled={busy||dirty||!draft.trim()||unresolved||!active||review.suspected_spam||review.approved_version===review.version} onClick={()=>action('approve')}>{review.approved_version===review.version?'Draft approved':'Approve draft only'}</button>{canPublish&&<button disabled={busy||dirty||!draft.trim()||unresolved||!active||review.suspected_spam||review.publish_state==='published'} onClick={()=>action('publish')} className="tr-button-primary">Submit to Google</button>}{unresolved&&<button disabled={busy||!active} onClick={()=>action('reconcile')}>Check publish result</button>}</div>
  {dirty&&<p className="tr-draft-notice">Save your changes before approval.</p>}{message&&<p role="status" className="tr-draft-notice">{message}</p>}
 </article>;
}

