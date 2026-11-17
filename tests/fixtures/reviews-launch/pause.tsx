import React from 'react';
import {createRoot} from 'react-dom/client';
import {CustomerLocations} from '../../../src/components/account/customer-locations';
import '../../../src/app/globals.css';
import '../../../src/app/prismatic.css';
import '../../../src/app/workspace.css';
import '../../../src/app/prismatic-account.css';
const legacy=new URLSearchParams(location.search).has('legacy');
const business={id:'11111111-1111-4111-8111-111111111111',business_name:'Cedar Studio',address:'12 Market Street, New York',connected:true,google_assignment_exists:true,google_enabled:true,google_connection_available:true,service_paused:false,service_pause_available:!legacy,settings_version:1,synced_at:new Date().toISOString(),last_error:null,draft_error:null,draft_due_at:null,auto_enabled:false,auto_four:false,auto_five:false,draft_low_stars:true,unanswered_count:43,positive_unanswered_count:22,review_count:126,draft_count:2,manual_draft_count:2,active_draft_count:2,historical_draft_count:0,local_profile_version:1,rating_summary:{sum:540,count:126}};
window.fetch=async(input,options)=>{
 const url=new URL(String(input),location.origin);
 if(url.origin!==location.origin||url.pathname!=='/api/account/local')throw Error('External requests blocked in fixture');
 if(options?.method==='POST'){
  const body=JSON.parse(String(options.body));
  if(legacy||body.action!=='setServicePaused')return Response.json({error:'Fixture only supports service pause'},{status:403});
  business.service_paused=body.paused;business.google_enabled=!body.paused;business.settings_version++;
  return Response.json({ok:true});
 }
 return Response.json({locations:[business],listings:[],licenses:{unlimited_locations:false,location_limit:1,used:1,period_locked:!legacy,reserved_until:'2026-12-17T00:00:00Z'}});
};
createRoot(document.getElementById('root')!).render(<div className="tr-prismatic-account"><main className="tr-client-shell tr-app-shell" style={{display:'block',padding:24,maxWidth:1200,margin:'auto'}}><p style={{fontSize:12,marginBottom:20}}>Isolated visual QA · synthetic data · no billing or Google calls</p><div className="tr-workspace-content"><CustomerLocations businesses={[]}/></div></main></div>);
