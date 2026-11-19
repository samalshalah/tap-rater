'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Bell} from 'lucide-react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import type {ReviewEmailSettings} from '@/lib/review-email-preferences';
import {ReviewNotificationForm} from './review-notification-form';

export type NotificationLocation={id:string;name:string;settings:ReviewEmailSettings};

const modeLabel:Record<ReviewEmailSettings['lowMode'],string>={off:'Off',immediate:'As reviews arrive',daily:'Daily digest'};
const hourLabel=(h:number)=>`${h%12||12}:00 ${h<12?'AM':'PM'}`;

/** Review email settings per location, shown as My Stands-style cards; editing opens the existing form in a dialog. */
export function ReviewNotificationLocations({locations,email}:{locations:NotificationLocation[];email:string}){
 const router=useRouter();
 const [editing,setEditing]=useState<NotificationLocation|null>(null);
 const close=()=>{setEditing(null);router.refresh();};
 return <>
  <div role="list" aria-label="Notification settings by location" className="grid gap-3">{locations.map(location=>{
   const v=location.settings;
   const reports=[v.weekly&&'Weekly report',v.monthly&&'Monthly report'].filter(Boolean) as string[];
   const anyOn=v.lowMode!=='off'||v.highMode!=='off'||reports.length>0;
   const timed=v.weekly||v.monthly||v.lowMode==='daily'||v.highMode==='daily';
   return <article key={location.id} role="listitem" className="tr-stand-row tr-card tr-notification-row p-4">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
     <div className="flex min-w-0 items-center gap-3">
      <div className="tr-stand-thumbnail flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white p-1"><Bell size={22} className="text-muted" aria-hidden="true"/></div>
      <div className="min-w-0">
       <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-medium text-ink">{location.name}</h3><span className={`tr-badge ${anyOn?'is-success':''}`}>{anyOn?'Alerts on':'All emails off'}</span></div>
       <p className="mt-1 text-xs text-muted">1–3★: <strong className="text-ink">{modeLabel[v.lowMode]}</strong> · 4–5★: <strong className="text-ink">{modeLabel[v.highMode]}</strong>{reports.length>0&&<> · {reports.join(' · ')}</>}{timed&&<> · around {hourLabel(v.hour)} {v.zone}</>}</p>
      </div>
     </div>
     <div className="flex shrink-0 flex-wrap items-center gap-2"><button type="button" className="tr-button-primary" onClick={()=>setEditing(location)}>Edit notifications</button></div>
    </div>
   </article>;
  })}</div>
  {editing&&<ModalDialog labelledBy="notification-settings-title" onClose={close}><div className="w-[min(560px,calc(100vw-32px))]">
   <ReviewNotificationForm key={editing.id} headingId="notification-settings-title" name={editing.name} email={email} initial={editing.settings} onClose={close}/>
  </div></ModalDialog>}
 </>;
}
