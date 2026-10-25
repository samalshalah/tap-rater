 'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ModalDialog} from '@/components/ui/modal-dialog';
/** Row backgrounds navigate only to existing links or explicitly marked popup openers.
 * Mutation actions remain accessible exclusively through their original buttons. */
export function AdminRowExplorer({children}:{children:ReactNode}){
 const root=useRef<HTMLDivElement>(null),[details,setDetails]=useState<{title:string;fields:{label:string;value:string}[]}|null>(null);
 useEffect(()=>{
  const el=root.current;if(!el)return;
  const enhance=()=>{el.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row=>{
   if(row.closest('dialog')||row.hasAttribute('data-admin-row')||row.cells.length<2||row.cells[0]?.colSpan>1)return;
   row.dataset.adminRow='true';if(!row.hasAttribute('tabindex'))row.tabIndex=0;
   row.setAttribute('aria-label',`Open details: ${row.cells[0].innerText.trim().slice(0,90)}`);
  });};
  const activate=(event:MouseEvent|KeyboardEvent)=>{
   if(event instanceof KeyboardEvent&&!['Enter',' '].includes(event.key))return;
   const target=event.target;if(!(target instanceof Element)||target.closest('a,button,input,select,textarea,label,summary,[contenteditable=true],dialog'))return;
   const row=target.closest<HTMLTableRowElement>('tr[data-admin-row]');if(!row||!el.contains(row))return;
   if(event instanceof MouseEvent&&(event.ctrlKey||event.metaKey||event.shiftKey||window.getSelection()?.toString()))return;
   event.preventDefault();
   const opener=row.querySelector<HTMLButtonElement>('button[data-admin-row-open]:not(:disabled)');if(opener){opener.click();return;}
   const link=row.querySelector<HTMLAnchorElement>('a[href^="/admin/"]');if(link){link.click();return;}
   const headers=Array.from(row.closest('table')?.querySelectorAll('thead th')||[]).map(h=>h.textContent?.trim()||'');
   const fields=Array.from(row.cells).flatMap((cell,i)=>{
    const label=headers[i]||`Detail ${i+1}`;if(label==='Actions'||cell.querySelector('button,input,select,textarea'))return [];
    const value=cell.innerText.trim();return value?[{label,value}]:[];
   });
   if(fields.length)setDetails({title:fields[0].value.slice(0,100),fields});
  };
  enhance();const observer=new MutationObserver(enhance);observer.observe(el,{childList:true,subtree:true});
  el.addEventListener('click',activate);el.addEventListener('keydown',activate);
  return()=>{observer.disconnect();el.removeEventListener('click',activate);el.removeEventListener('keydown',activate);};
 },[]);
 return <div ref={root} className="tr-admin-content">{children}{details&&<ModalDialog labelledBy="admin-row-title" onClose={()=>setDetails(null)}><section className="tr-admin-details-dialog"><header><h2 id="admin-row-title" data-dialog-heading tabIndex={-1}>{details.title}</h2><button type="button" className="tr-button-ghost" onClick={()=>setDetails(null)} aria-label="Close details">×</button></header><dl>{details.fields.map((field,i)=><div key={i}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl><footer><button type="button" className="tr-button-ghost" onClick={()=>setDetails(null)}>Close</button></footer></section></ModalDialog>}</div>;
}
