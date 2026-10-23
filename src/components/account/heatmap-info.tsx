'use client';
import {useId,useState,type ReactNode} from 'react';
import {Info} from 'lucide-react';

export function HeatmapInfo({label,children}:{label:string;children:ReactNode}){
 const id=useId(),[open,setOpen]=useState(false);
 return <span className={'tr-heatmap-info'+(open?' is-open':'')}><button type="button" aria-label={label} aria-describedby={id} aria-expanded={open} onClick={()=>setOpen(!open)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.currentTarget.blur();}}}><Info size={15}/></button><span id={id} role="tooltip">{children}</span></span>;
}
