"use client";
import {Bell} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
type Feed={count:number;items:{id:string;title:string;client:string;location:string;lastSeen:string;occurrences:number;path:string;href:string}[]};
export function AdminNotifications(){
 const ref=useRef<HTMLDetailsElement>(null),running=useRef(false),alive=useRef(true);
 const [feed,setFeed]=useState<Feed|null>(null),[error,setError]=useState('');
 async function load(){if(running.current)return;running.current=true;try{const r=await fetch('/api/admin/notifications',{cache:'no-store'});if(!r.ok)throw new Error();const data=await r.json();if(alive.current){setFeed(data);setError('');}}catch{if(alive.current)setError('Could not load notifications.');}finally{running.current=false;}}
 useEffect(()=>{alive.current=true;void load();const timer=setInterval(()=>{if(!document.hidden)void load();},60000);
 const outside=(event:PointerEvent)=>{if(ref.current&&!ref.current.contains(event.target as Node))ref.current.open=false;};
 const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&ref.current?.open){ref.current.open=false;ref.current.querySelector('summary')?.focus();}};
 document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
 return()=>{alive.current=false;clearInterval(timer);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[]);
 return <details className="tr-admin-notifications" ref={ref} onToggle={event=>{if(event.currentTarget.open)void load();}}>
 <summary aria-label={`Notifications${feed?`, ${feed.count} active client issues`:''}`} title="Client failure notifications"><Bell size={17}/>{Boolean(feed?.count)&&<span className="tr-admin-notification-count">{feed!.count>99?'99+':feed!.count}</span>}</summary>
 <section className="tr-admin-notification-panel" aria-label="Client failure notifications"><header><strong>Notifications</strong><span>{feed?.count??'…'} active issues</span></header>
 {error&&<p role="status">{error} <button type="button" onClick={()=>void load()}>Retry</button></p>}
 {!feed&&!error&&<p role="status">Loading notifications…</p>}
 {feed?.count===0&&<p>No active client failures.</p>}
 <ul>{feed?.items.map(item=><li key={item.id}><a href={item.href}><strong>{item.title}</strong><span>{item.client} · {item.location}</span><small>{new Date(item.lastSeen).toLocaleString('en-US',{timeZone:'America/New_York'})} ET · {item.occurrences} observations</small></a></li>)}</ul>
 <footer><a href="/admin/client-failures">View all client failures →</a></footer>
 </section></details>;
}
