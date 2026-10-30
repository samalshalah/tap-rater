 'use client';
import {useEffect} from 'react';
const last=new Map<string,number>();
export function reportClientFailure(kind:'page_render'|'javascript'|'unhandled_promise'|'network'|'operation_failed'){
 if(!['taprater.com','www.taprater.com'].includes(window.location.hostname))return;
 const path=window.location.pathname,key=kind+path;if(Date.now()-(last.get(key)||0)<60000)return;
 last.set(key,Date.now());
 void fetch('/api/account/client-failures',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,path}),keepalive:true}).catch(()=>{});
}
export function ClientFailureObserver(){
 useEffect(()=>{const original=window.fetch;let active=true,leaving=false;const pagehide=()=>{leaving=true;},pageshow=()=>{leaving=false;};window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',pageshow);
 const wrapped:typeof fetch=async(input,init)=>{let monitored=false;try{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,window.location.href);monitored=url.origin===window.location.origin&&/^\/api\/(account|activate|checkout|forms|landing-pages|media|setup|site)(\/|$)/.test(url.pathname)&&url.pathname!=='/api/account/client-failures';}catch{}
 try{const response=await original(input,init);if(active&&!leaving&&monitored&&response.ok&&response.headers.get('content-type')?.includes('application/json')){void response.clone().json().then(body=>{if(active&&!leaving&&(body?.ok===false||body?.success===false||typeof body?.error==='string'&&body.error))reportClientFailure('operation_failed');}).catch(()=>{});}return response;}catch(e){if(active&&!leaving&&monitored&&(e as Error)?.name!=='AbortError')reportClientFailure('network');throw e;}};
 window.fetch=wrapped;
 const error=(event:ErrorEvent)=>{if(active&&!leaving&&event.error)reportClientFailure('javascript');};const rejection=(event:PromiseRejectionEvent)=>{if(active&&!leaving&&event.reason?.name!=='AbortError')reportClientFailure('unhandled_promise');};
 window.addEventListener('error',error);window.addEventListener('unhandledrejection',rejection);
 return()=>{active=false;window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);if(window.fetch===wrapped)window.fetch=original;window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',rejection);};},[]);return null;
}
