import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ReviewsPurchaseForm} from '../../../src/components/account/reviews-purchase-form';
import {ReviewAutomationControls} from '../../../src/components/account/review-automation-controls';
import '../../../src/app/globals.css';
let workspace={business_id:'qa',business_name:'QA Cafe',ai_consent:false,auto_enabled:false,auto_four:false,auto_five:false,auto_style:'friendly',settings_version:1,reply_delay_minutes:360,draft_low_stars:false};
// Local component harness only. No Stripe, Google, database, or production requests.
window.fetch=async(url,options)=>{
 const body=options?.body?JSON.parse(String(options.body)):null;
 if(String(url).includes('marketing-subscription')){
  sessionStorage.setItem('qa-last-request',JSON.stringify(body));
  return new Response(JSON.stringify({url:'/simulated-payment'}));
 }
 if(body?.action==='settings'){
  const s=body.settings;workspace={...workspace,ai_consent:s.aiConsent,auto_enabled:s.autoEnabled,auto_four:s.four,auto_five:s.five,draft_low_stars:s.lowStars,settings_version:workspace.settings_version+1};
 }
 return new Response(JSON.stringify({workspaces:[workspace],knowledge:null}));
};
function App(){
 const [w,setW]=useState(workspace);
 return <main className="mx-auto max-w-3xl space-y-8 p-6"><p className="rounded bg-amber-100 p-3">Local QA: real components, simulated payments and Google services. No real charges or public replies.</p>{location.pathname==='/simulated-payment'?<section><h1 className="text-2xl">Simulated secure payment</h1><p>Request: {sessionStorage.getItem('qa-last-request')}</p><a href="/" className="underline">Cancel and return to packages</a></section>:<><ReviewsPurchaseForm guest/><section className="rounded border bg-white p-6"><h2 className="mb-4 text-xl">QA Cafe reply settings</h2><ReviewAutomationControls location={{id:'qa',connected:true,...w}} onSaved={async()=>setW({...workspace})}/></section></>}</main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
