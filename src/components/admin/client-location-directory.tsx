"use client";
import {useEffect,useRef,useState} from 'react';
import './client-location-directory.css';
import {Building2, ChevronDown} from 'lucide-react';

type Location = {id:string; name:string};
type Account = {id:string; name:string; email:string; locations:Location[]};

export function ClientLocationDirectory(){
  const panel=useRef<HTMLElement>(null);
  const [open,setOpen]=useState(false);
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const [accountId,setAccountId]=useState('');
  const [locationId,setLocationId]=useState('');
  useEffect(()=>{
    const section=panel.current;
    if(!section)return;
    const sync=()=>setOpen(section.matches(':popover-open'));
    section.addEventListener('toggle',sync);
    sync();
    return ()=>section.removeEventListener('toggle',sync);
  },[]);
  useEffect(()=>{
    if(!open)return;
    const controller=new AbortController();
    setLoading(true);setError(false);
    (async()=>{
      const response=await fetch('/api/admin/client-directory',{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error();
      const data:Account[]=await response.json();
      if(!controller.signal.aborted){setAccounts(data);setLoading(false);}
    })().catch(()=>{if(!controller.signal.aborted){setError(true);setLoading(false);}});
    return ()=>controller.abort();
  },[open,attempt]);

  const filtered=accountId?accounts.filter(account=>account.id===accountId):accounts;
  const locations=filtered.flatMap(account=>account.locations.map(location=>({...location,account:account.email})));
  return <div className="tr-client-directory">
    <button type="button" popoverTarget="admin-client-directory" className="tr-directory-trigger"><Building2 size={16} aria-hidden="true"/> Clients &amp; locations <ChevronDown size={14} aria-hidden="true"/></button>
    <section id="admin-client-directory" popover="auto" ref={panel} aria-label="Client accounts and locations" className="tr-directory-panel">
      <h2>Client accounts &amp; locations</h2>
      {loading?<p role="status">Loading accounts…</p>:error?<p role="alert">Accounts could not be loaded. <button onClick={()=>setAttempt(a=>a+1)}>Retry</button></p>:<>
        <div className="tr-directory-selects">
          <label>Client account<select value={accountId} onChange={event=>{setAccountId(event.target.value);setLocationId('');}}>
            <option value="">All client accounts ({accounts.length})</option>
            {accounts.map(account=><option key={account.id} value={account.id}>{account.name} · {account.email}</option>)}
          </select></label>
          <label>Location<select value={locationId} onChange={event=>setLocationId(event.target.value)}>
            <option value="">All locations ({locations.length})</option>
            {locations.map(location=><option key={location.id} value={location.id}>{location.name}{!accountId?' · '+location.account:''}</option>)}
          </select></label>
        </div>
        <div className="tr-directory-results" aria-live="polite">
          {!filtered.length&&<p>No client accounts found.</p>}
          {filtered.map(account=>{
            const visible=account.locations.filter(location=>!locationId||location.id===locationId);
            if(locationId&&!visible.length)return null;
            return <div key={account.id}><strong>{account.name}</strong><small>{account.email}</small>
              {visible.length?<ul>{visible.map(location=><li key={location.id}>{location.name}</li>)}</ul>:<p>No locations added.</p>}</div>;
          })}
        </div>
      </>}
    </section>
  </div>;
}
