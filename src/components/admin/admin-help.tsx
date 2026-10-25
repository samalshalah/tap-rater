 'use client';
import {useState,type ReactNode} from 'react';
import {ModalDialog} from '@/components/ui/modal-dialog';
export function AdminHelp({title,children}:{title:string;children:ReactNode}){const [open,setOpen]=useState(false);return <><button type="button" className="tr-admin-info-button" aria-label={`About ${title}`} onClick={()=>setOpen(true)}>?</button>{open&&<ModalDialog labelledBy="admin-help-title" onClose={()=>setOpen(false)}><section className="tr-admin-details-dialog"><header><h2 id="admin-help-title" data-dialog-heading tabIndex={-1}>{title}</h2><button type="button" className="tr-button-ghost" onClick={()=>setOpen(false)}>Close</button></header><div>{children}</div></section></ModalDialog>}</>;}
