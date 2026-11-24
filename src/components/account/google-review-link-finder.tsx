"use client";
import {Search} from 'lucide-react';
import {useEffect,useState} from 'react';
import {searchGoogleBusinesses,type GoogleBusinessSelection} from '@/lib/google-places-client';

// Finds the business on Google and returns its "write a review" link for a Multi-Link button.
export function GoogleReviewLinkFinder({initialQuery,onPick,onClose}:{initialQuery:string;onPick:(url:string)=>void;onClose:()=>void}){
  const [query,setQuery]=useState(initialQuery);
  const [status,setStatus]=useState<'idle'|'loading'|'ready'|'fallback'>('idle');
  const [results,setResults]=useState<GoogleBusinessSelection[]>([]);

  useEffect(()=>{
    const normalized=query.trim();
    if(normalized.length<3){setResults([]);setStatus('idle');return;}
    const controller=new AbortController();
    const timer=window.setTimeout(()=>{
      setStatus('loading');
      searchGoogleBusinesses(normalized,controller.signal)
        .then(result=>{setResults(result.results);setStatus(result.configured&&!result.message?'ready':'fallback');})
        .catch((error:unknown)=>{if(error instanceof DOMException&&error.name==='AbortError')return;setResults([]);setStatus('fallback');});
    },350);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[query]);

  return <div className="grid gap-2 rounded-lg border border-line bg-white p-3 col-span-2 md:col-span-3">
    <label className="grid gap-1 text-xs font-semibold text-ink">
      Find your Google Business Profile
      <span className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true"/>
        <input className="tr-input min-h-9 pl-9 text-sm" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Business name and city" autoComplete="off" autoFocus/>
      </span>
    </label>
    {status==='idle'&&<p className="text-xs text-muted">Enter at least 3 characters.</p>}
    {status==='loading'&&<p className="text-xs text-muted" role="status">Searching Google…</p>}
    {status==='fallback'&&<p className="text-xs text-muted" role="status">Google search is unavailable right now. Paste the review link instead.</p>}
    {status==='ready'&&!results.length&&<p className="text-xs text-muted" role="status">No match. Try adding the city.</p>}
    {results.length>0&&<div role="listbox" aria-label="Google Business results" className="grid overflow-hidden rounded-md border border-line">
      {results.map(place=><button key={place.placeId} type="button" role="option" aria-selected={false} className="border-b border-line px-3 py-2 text-left text-sm last:border-b-0 hover:bg-soft" onClick={()=>{onPick(place.reviewUrl);onClose();}}>
        <span className="block font-medium text-ink">{place.name}</span>
        {place.formattedAddress&&<span className="block text-xs text-muted">{place.formattedAddress}</span>}
      </button>)}
    </div>}
    <button type="button" className="w-fit text-xs font-semibold text-brand" onClick={onClose}>Close</button>
  </div>;
}
