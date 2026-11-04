"use client";
import { useEffect,useRef,useState } from 'react';
import { Bot,CircleHelp,History,X } from 'lucide-react';
import { LiveCard } from './google-live-review-card';
import { ReviewAvatar,ReviewStars,reviewDate,reviewerName } from './google-live-review-display';
import { activateListRow } from './list-row-action';
export function ReviewListRow(props:Parameters<typeof LiveCard>[0]){
 const {review}=props;
 const dialog=useRef<HTMLDialogElement>(null),edits=useRef({dirty:false,busy:false});
 const [open,setOpen]=useState(false);
 useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
 function close(){if(edits.current.busy)return;if(edits.current.dirty&&!window.confirm('Discard unsaved reply changes?'))return;dialog.current?.close();setOpen(false);}
 const name=reviewerName(review);
 const hasReply=Boolean(review.data.reviewReply?.comment);
 const tapRaterReply=hasReply&&review.publish_state==='published'&&Boolean(review.attempted_at);
 const updateTime=review.data.updateTime?Date.parse(review.data.updateTime):NaN;
 const consentTime=props.consentAt?Date.parse(props.consentAt):NaN;
 const preExistingReply=hasReply&&!tapRaterReply&&Number.isFinite(updateTime)&&Number.isFinite(consentTime)&&updateTime<=consentTime;
 const sourceLabel=tapRaterReply?'Tap Rater posted this reply':preExistingReply?'This reply was already on Google before Tap Rater was activated':'Reply exists on Google; Tap Rater has no matching publish record';
 const status=hasReply?'Replied':'Queued';
 return <tr className={"tr-review-row"+(review.suspected_spam?" bg-amber-50":"")} data-dashboard-row onClick={event=>activateListRow(event,()=>setOpen(true))}>
 <th scope="row"><div className="tr-review-person"><ReviewAvatar name={name}/><img src="/brand/google-g.png" width="18" height="18" alt="Google"/><button type="button" className="tr-review-row-trigger" aria-label={'Open review details for '+name} onClick={()=>setOpen(true)}>{name}</button></div></th>
 <td><ReviewStars rating={review.data.starRating}/></td>
 <td><span className="tr-review-excerpt">{review.data.comment||'Rating only; no written review.'}</span></td>
 <td><span className={'tr-review-status status-'+(hasReply?'replied':'queued')}>{status}</span>{hasReply&&<span className={'tr-review-source '+(tapRaterReply?'is-taprater':preExistingReply?'is-existing':'is-unknown')} title={sourceLabel} aria-label={sourceLabel}>{tapRaterReply?<Bot size={13} aria-hidden="true"/>:preExistingReply?<History size={13} aria-hidden="true"/>:<CircleHelp size={13} aria-hidden="true"/>}<span className="sr-only">{sourceLabel}</span></span>}
 {open&&<dialog ref={dialog} className="tr-review-dialog" aria-label={'Review and reply draft from '+name} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current)close();}} onClose={()=>setOpen(false)}>
 <header><h2>Review details</h2><button aria-label="Close review details" onClick={close} autoFocus><X size={24}/></button></header>
 <LiveCard {...props} key={review.version+':'+review.publish_state} onState={(dirty,busy)=>{edits.current={dirty,busy};}}/>
 </dialog>}</td>
 <td className="tr-review-date">{reviewDate(review)}</td></tr>;
}
