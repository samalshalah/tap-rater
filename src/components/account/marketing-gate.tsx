import Link from 'next/link';
import {getCustomerMarketingState} from '@/lib/customer-marketing-access';
import {FirstLoginSetup} from './first-login-setup';
export function MarketingUpgrade(){return <section className="tr-marketing-upgrade"><h1>This service is not available yet</h1><p>You can still manage your stands and orders.</p><Link className="tr-button-primary" href="/account/orders">View orders</Link></section>}
export async function MarketingGate({email,children}:{email:string;children:React.ReactNode}){
 try{const state=await getCustomerMarketingState(email);if(state.allowed)return state.onboardingCompleted?<>{children}</>:<FirstLoginSetup>{children}</FirstLoginSetup>;}
 catch{return <section className="tr-marketing-upgrade"><h1>Package access unavailable</h1><p>Please reload in a moment. Your stands and orders are still available.</p></section>;}
 return <MarketingUpgrade/>;
}
