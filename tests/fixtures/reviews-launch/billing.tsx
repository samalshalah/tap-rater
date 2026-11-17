import React from 'react';
import {createRoot} from 'react-dom/client';
import {ReviewsBillingPlan} from '../../../src/components/account/reviews-billing-plan';
import '../../../src/app/globals.css';
import '../../../src/app/workspace.css';
import '../../../src/app/prismatic-account.css';
let pendingIds:string[]=[],cancelling=false;
const locations=['Cedar Studio','Maple Kitchen','Oak Bakery'].map((name,i)=>({id:`11111111-1111-4111-8111-11111111111${i}`,name,address:`${i+1} Market Street, New York`}));
window.fetch=async(input,options)=>{
 const url=new URL(String(input),location.origin);if(url.origin!==location.origin||url.pathname!=='/api/account/reviews-plan')throw Error('External calls blocked in QA');
 if(options?.method==='POST'){
  const body=JSON.parse(String(options.body)),choice=body.choice||body.request.choice;
  const count=choice.kind==='cancel'?0:choice.kind==='keep'?3:3-choice.removedIds.length;
  if(body.action==='preview')return Response.json({token:'a'.repeat(64),kind:choice.kind,removedIds:choice.removedIds,currentQuantity:3,nextQuantity:count,currentSubtotal:8700,nextSubtotal:count*2900,currency:'usd',effectiveAt:'2026-12-17T12:00:00Z'});
  pendingIds=choice.kind==='locations'?choice.removedIds:[];cancelling=choice.kind==='cancel';return Response.json({ok:true});
 }
 const nextQuantity=cancelling?0:3-pendingIds.length;
 return Response.json({selfServe:true,quantity:3,subtotal:8700,currency:'usd',nextQuantity,nextSubtotal:nextQuantity*2900,periodEnd:'2026-12-17T12:00:00Z',cancelling,pendingIds,locations:locations.map(l=>({...l,removing:pendingIds.includes(l.id)}))});
};
createRoot(document.getElementById('root')!).render(<div className="tr-prismatic-account"><main className="tr-client-shell tr-app-shell" style={{display:'block',maxWidth:1200,margin:'auto'}}><div className="tr-workspace-content"><p>Isolated billing QA · synthetic data · no Stripe or Google calls</p><ReviewsBillingPlan/></div></main></div>);
