'use client';
import {useState} from 'react';
import {licenceExpiryAfterDays,licenceCustomExpiry,licenceLocalDate} from '@/lib/licence-duration';
export function LicenceDuration({value,onChange}:{value:string|null;onChange:(value:string|null)=>void}){
 const [choice,setChoice]=useState(value?'custom':'none');
 return <div className="grid content-start gap-2"><label className="grid gap-1.5 font-medium">Duration<select className="tr-input" value={choice} onChange={e=>{const next=e.target.value;setChoice(next);onChange(next==='none'?null:next==='custom'?(value||licenceExpiryAfterDays(30)):licenceExpiryAfterDays(Number(next)));}}><option value="none">No expiry</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="custom">Choose end date</option></select></label>{choice==='custom'&&<label className="grid gap-1.5 font-medium">End date<input className="tr-input" type="date" required min={licenceLocalDate(new Date().toISOString())} value={licenceLocalDate(value)} onChange={e=>{if(e.target.value)onChange(licenceCustomExpiry(e.target.value));}}/></label>}{value&&choice!=='custom'&&<p className="text-xs text-muted">Ends {new Date(value).toLocaleDateString()}</p>}</div>;
}
