import React from 'react';
import {createRoot} from 'react-dom/client';
import {FirstLoginSetup} from '../../../src/components/account/first-login-setup';
import '../../../src/app/globals.css';
import '../../../src/app/prismatic.css';
// This browser harness replays only responses captured by the real onboarding
// handlers in the isolated database test. It never accesses Google or production.
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,options)=>{
 const url=new URL(String(input),location.origin);
 if(url.origin!==location.origin||url.pathname!=='/api/account/onboarding')throw Error('Only local onboarding replay is permitted');
 return nativeFetch(input,options);
};
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-3xl p-6"><p className="mb-6 rounded bg-amber-100 p-4">Isolated QA: Norah review import and setup completion. Real setup component; replayed responses from the QA database test. No Google writes or production changes.</p><FirstLoginSetup><section><h1 className="text-2xl font-semibold">QA dashboard ready</h1><p>Norah Boutique · 22 imported reviews</p><p>AI replies and automatic posting remain off.</p></section></FirstLoginSetup></main>);
