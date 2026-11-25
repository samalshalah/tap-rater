"use client";
import {useEffect,useState} from 'react';

/**
 * Where the stand's QR and NFC send people once a cancelled Multi-Link page has ended,
 * instead of the "not active" page. Empty means the "not active" page.
 */
export function MultiLinkForwardLink({code,ended,end}:{code:string;ended:boolean;end:string}){
  const [value,setValue]=useState(''),[saved,setSaved]=useState<string|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  useEffect(()=>{let live=true;fetch(`/api/account/hosted-page/forward?code=${encodeURIComponent(code)}`).then(r=>r.ok?r.json():null).then(body=>{if(!live)return;const url=body?.forwardUrl??null;setSaved(url);setValue(url??'');}).catch(()=>undefined).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[code]);

  async function save(url:string){
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/account/hosted-page/forward',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,url})});
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(body?.error||'The forwarding link couldn’t be saved.');
      setSaved(body?.forwardUrl??null);setValue(body?.forwardUrl??'');
      setNotice(body?.forwardUrl?'Saved.':'Removed. Your stand will show a “not active” page.');
    }catch(failure){setError(failure instanceof Error?failure.message:'The forwarding link couldn’t be saved.');}
    finally{setBusy(false);}
  }

  return <form className="grid gap-2 rounded-lg border border-line bg-soft p-3" onSubmit={event=>{event.preventDefault();void save(value);}}>
    <label className="grid gap-1.5">
      <span className="font-medium text-ink">{ended?'Send people to another link':`After ${end}, send people to`}</span>
      <span className="text-xs text-muted">Your stand’s QR code and NFC will open this link instead of a “not active” page. Optional.</span>
      <input className="tr-input" type="url" inputMode="url" placeholder="https://yourbusiness.com" value={value} disabled={loading||busy} onChange={event=>{setValue(event.target.value);setNotice('');}} maxLength={500}/>
    </label>
    <div className="flex flex-wrap items-center gap-2">
      <button type="submit" className="tr-button-ghost" disabled={loading||busy||value.trim()===(saved??'')}>{busy?'Saving…':'Save link'}</button>
      {saved&&<button type="button" className="tr-button-ghost text-muted" disabled={busy} onClick={()=>void save('')}>Remove</button>}
      {notice&&<span role="status" className="text-xs text-muted">{notice}</span>}
    </div>
    {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
  </form>;
}
