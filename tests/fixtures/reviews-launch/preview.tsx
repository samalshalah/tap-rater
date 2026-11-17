import React from 'react';
import {createRoot} from 'react-dom/client';
import {ReviewsPurchaseForm} from '../../../src/components/account/reviews-purchase-form';
import '../../../src/app/globals.css';
import '../../../src/app/prismatic.css';
import styles from '../../../src/components/account/reviews-checkout.module.css';
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,options)=>{const url=new URL(String(input),location.origin);if(url.origin!==location.origin)throw Error('External requests blocked in fixture');return nativeFetch(input,options);};
createRoot(document.getElementById('root')!).render(<main className="tr-prismatic-storefront" style={{padding:'24px 16px'}}><p style={{textAlign:'center',fontSize:12,marginBottom:24}}>Isolated visual QA · synthetic business and review data · no Google or Stripe calls</p><div className={styles.container}><div className={styles.card}><ReviewsPurchaseForm guest/></div></div></main>);
