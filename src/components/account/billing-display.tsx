import type {ReactNode} from 'react';
import type {CustomerPortalSubscription} from '@/lib/customer-portal';
export const subscriptionStatus=(subscription:CustomerPortalSubscription)=>subscription.source==='admin'&&subscription.currentPeriodEnd&&Date.parse(subscription.currentPeriodEnd)<=Date.now()?'expired':subscription.lifecycleStatus;
export const statusText=(value:string)=>value.replaceAll('_',' ');
export const date=(value?:string)=>value ? new Date(value).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}) : '';
export function money(cents:number,currency='usd'){return new Intl.NumberFormat('en-US',{style:'currency',currency:currency.toUpperCase()}).format(cents/100);}

export function Badge({status}:{status:string}){return <span className="rounded-full bg-soft px-2 py-1 text-xs capitalize text-muted">{statusText(status)}</span>;}
export function Detail({label,value}:{label:ReactNode;value:ReactNode}){return <div className="flex justify-between gap-4"><dt className="text-muted">{label}</dt><dd className="text-right">{value}</dd></div>;}
export function DocumentLink({href,children}:{href:string;children:ReactNode}){return <a href={href} target="_blank" rel="noreferrer" className="tr-button-ghost">{children}</a>;}
