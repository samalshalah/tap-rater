'use client';
import {useEffect,useId,useState} from 'react';
import {searchGoogleBusinesses,type GoogleBusinessSelection} from '@/lib/google-places-client';

export function SetupBusinessPicker({onChange}:{onChange:(value:GoogleBusinessSelection|null)=>void}){
 const id=useId(),[query,setQuery]=useState(''),[results,setResults]=useState<GoogleBusinessSelection[]>([]),[selected,setSelected]=useState<GoogleBusinessSelection|null>(null),[open,setOpen]=useState(false),[active,setActive]=useState(0),[message,setMessage]=useState('Enter a business name and city.'),[manual,setManual]=useState(false),[name,setName]=useState(''),[link,setLink]=useState('');
 useEffect(()=>{
  if(manual||selected||query.trim().length<3)return;
  const controller=new AbortController();const timer=setTimeout(()=>{
   setMessage('Searching…');
   searchGoogleBusinesses(query,controller.signal).then(r=>{if(controller.signal.aborted)return;setResults(r.results);setActive(0);setMessage(r.results.length?'Choose your business.':'No matches. Try a city or use your review link.');}).catch(()=>{if(!controller.signal.aborted)setMessage('Search unavailable. Use your Google review link.');});
  },350);return()=>{controller.abort();clearTimeout(timer);};
 },[query,selected,manual]);
 function choose(place:GoogleBusinessSelection){setSelected(place);setQuery(place.name);setOpen(false);setResults([]);onChange(place);}
 function mode(value:boolean){setManual(value);setSelected(null);setResults([]);setOpen(false);onChange(null);}
 function manualChange(nextName:string,nextLink:string){setName(nextName);setLink(nextLink);let valid=false;try{const u=new URL(nextLink);valid=u.protocol==='https:'&&['google.com','www.google.com','search.google.com','maps.google.com','g.page','maps.app.goo.gl'].includes(u.hostname);}catch{}onChange(valid&&nextName.trim()?{name:nextName.trim(),formattedAddress:'',placeId:'',reviewUrl:nextLink.trim()}:null);}
 return <div className="h-[270px] text-sm">
  <div className="mb-3 flex gap-4"><button type="button" className={!manual?'font-semibold text-teal-700':'text-muted'} onClick={()=>mode(false)}>Find business</button><button type="button" className={manual?'font-semibold text-teal-700':'text-muted'} onClick={()=>mode(true)}>Use a review link</button></div>
  {manual?<div className="grid gap-3"><label>Business name<input className="mt-1 w-full rounded border border-line p-2" value={name} onChange={e=>manualChange(e.target.value,link)}/></label><label>Google review link<input type="url" placeholder="https://g.page/r/…/review" className="mt-1 w-full rounded border border-line p-2" value={link} onChange={e=>manualChange(name,e.target.value)}/></label><p className="text-xs text-muted">Paste the link from Google’s “Ask for reviews”. You’ll connect Google in the next step.</p></div>:<>
   <div className="relative" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}>
    <label htmlFor={id}>Business name and city</label><input id={id} role="combobox" aria-expanded={open&&results.length>0} aria-controls={`${id}-results`} aria-autocomplete="list" aria-activedescendant={open&&results.length?`${id}-${active}`:undefined} autoComplete="off" className="mt-1 w-full rounded border border-line p-2" value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setSelected(null);setResults([]);setOpen(true);onChange(null);setMessage('Enter at least 3 characters to search.');}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false);}if(results.length&&['ArrowDown','ArrowUp','Enter'].includes(e.key)){e.preventDefault();setOpen(true);if(e.key==='Enter')choose(results[active]);else setActive(n=>(n+(e.key==='ArrowDown'?1:-1)+results.length)%results.length);}}}/>
    {open&&results.length>0&&<div id={`${id}-results`} role="listbox" aria-label="Business search results" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[210px] overflow-y-auto rounded border border-line bg-white shadow-lg">{results.map((p,i)=><button key={p.placeId} id={`${id}-${i}`} type="button" role="option" aria-selected={i===active} onClick={()=>choose(p)} className={`block w-full border-b border-line px-3 py-2 text-left last:border-0 hover:bg-slate-50 ${i===active?'bg-slate-50':''}`}><span className="block font-medium">{p.name}</span><span className="block truncate text-xs text-muted">{p.formattedAddress}</span></button>)}</div>}
   </div>
   {selected?<div className="mt-4 rounded border border-line bg-slate-50 p-3"><p className="font-semibold">{selected.name}</p><p className="truncate text-xs text-muted">{selected.formattedAddress}</p><label className="mt-3 block text-xs">Google review link<input readOnly value={selected.reviewUrl} onFocus={e=>e.target.select()} className="mt-1 w-full rounded border border-line bg-white p-2 text-sm"/></label></div>:<p role="status" className="mt-2 text-xs text-muted">{message}</p>}
  </>}
 </div>;
}
