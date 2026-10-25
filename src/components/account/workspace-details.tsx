'use client';
import {useId,useState,type ReactNode} from 'react';
import {ModalDialog} from '@/components/ui/modal-dialog';

/** Secondary workspace information: one consistent, keyboard-accessible popup. */
export function WorkspaceDetails({label,title,children}:{label:string;title?:string;children:ReactNode}) {
 const [open,setOpen]=useState(false);const id=useId();
 return <><button type="button" className="tr-workspace-details-trigger" aria-haspopup="dialog" aria-label={label==='?'?title:label} onClick={()=>setOpen(true)}>{label}</button>{open&&<ModalDialog labelledBy={id} onClose={()=>setOpen(false)}><section className="tr-listing-dialog tr-workspace-details-dialog"><header><h2 id={id} tabIndex={-1} data-dialog-heading>{title||label}</h2><button type="button" aria-label={'Close '+(title||label)} onClick={()=>setOpen(false)}>✕</button></header><div className="tr-workspace-details-body">{children}</div></section></ModalDialog>}</>;
}
