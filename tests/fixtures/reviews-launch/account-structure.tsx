import React from 'react';
import {createRoot} from 'react-dom/client';
import {AccountNavigation} from '../../../src/components/account/account-navigation';
import {ReviewsBillingPlan} from '../../../src/components/account/reviews-billing-plan';
import {navigationForPurchases} from '../../../src/lib/customer-navigation';
import '../../../src/app/globals.css';
import '../../../src/app/prismatic.css';
import '../../../src/app/workspace.css';
import '../../../src/app/prismatic-account.css';
const mode=new URLSearchParams(location.search).get('mode')||'reviews';
window.fetch=async(input,options)=>{
 if(options?.method==='POST')throw Error('Read-only preview');
 if(String(input)!=='/api/account/reviews-plan')throw Error('External requests blocked');
 return Response.json({selfServe:false,access:{kind:'complimentary',status:'active',locations:1,expiresAt:'2026-12-18T12:00:00Z',drafts:1000}});
};
createRoot(document.getElementById('root')!).render(<div className="tr-prismatic-account"><main className="tr-account-shell tr-workspace-shell tr-client-shell tr-app-shell min-h-screen bg-soft"><AccountNavigation links={navigationForPurchases({service:mode!=='stands',stands:mode!=='reviews',multilink:mode==='both'})}/><div className="tr-app-main"><div className="tr-workspace-content"><p className="mb-4 text-xs">Isolated preview · sample data · no account changes</p><h1>{mode==='stands'?'Orders':'Subscription'}</h1>{mode==='stands'?<p>Your stand orders and receipts appear here.</p>:<ReviewsBillingPlan/>}</div></div></main></div>);
