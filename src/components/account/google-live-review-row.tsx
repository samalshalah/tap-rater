"use client";
import { useEffect,useRef,useState } from 'react';
import { X } from 'lucide-react';
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
 const status=review.scheduled_at?'Scheduled · '+new Date(review.scheduled_at).toLocaleString():review.suspected_spam?'Suspected spam':review.publish_state==='published'&&review.data.reviewReply?.comment?'Replied':review.draft?(review.approved_version===review.version?'Approved':'Draft'):review.data.reviewReply?.comment?'Replied':'Awaiting reply';
 return <tr className={"tr-review-row"+(review.suspected_spam?" bg-amber-50":"")} data-dashboard-row onClick={event=>activateListRow(event,()=>setOpen(true))}>
 <th scope="row"><div className="tr-review-person"><ReviewAvatar name={name}/><img src="/brand/google-g.png" width="18" height="18" alt="Google"/><span className="tr-review-name">{name}</span></div></th>
 <td><ReviewStars rating={review.data.starRating}/></td>
 <td><span className="tr-review-excerpt">{review.data.comment||'Rating only; no written review.'}</span></td>
 <td><span className={'tr-review-status status-'+status.toLowerCase().replace(' ','-')}>{status}</span></td>
 <td className="tr-review-date">{reviewDate(review)}</td>
 <td><button className="tr-button-ghost" aria-label={'Open review from '+name} onClick={()=>setOpen(true)}>Open</button>
 {open&&<dialog ref={dialog} className="tr-review-dialog" aria-label={'Review and reply draft from '+name} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current)close();}} onClose={()=>setOpen(false)}>
 <header><h2>Review details</h2><button aria-label="Close review details" onClick={close} autoFocus><X size={24}/></button></header>
 <LiveCard {...props} key={review.version+':'+review.publish_state} onState={(dirty,busy)=>{edits.current={dirty,busy};}}/>
 </dialog>}</td></tr>;
}
