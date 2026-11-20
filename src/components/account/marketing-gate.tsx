import Link from 'next/link';
import {getCustomerMarketingState} from '@/lib/customer-marketing-access';
import {FirstLoginSetup} from './first-login-setup';
export function MarketingUpgrade({endedAt}:{endedAt?:string|null}={}){
 if(endedAt){
  const ended=new Date(endedAt),date=ended.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
  const kept=new Date(ended.getTime()+30*86400000).toLocaleDateString('en-US',{month:'long',day:'numeric',timeZone:'UTC'});
  const recent=Date.now()<ended.getTime()+30*86400000;
  return <section className="tr-marketing-upgrade"><h1>Your Google Reviews subscription ended on {date}</h1><p>{recent?`Subscribe again before ${kept} to pick up where you left off with your saved reviews and drafts.`:'Subscribe again to import your reviews and turn on AI replies.'} Your stands and orders are still available.</p><div className="flex flex-wrap gap-3"><Link className="tr-button-primary" href="/google-reviews#plan">Subscribe again</Link><Link className="tr-button-ghost" href="/account/orders">View orders</Link></div></section>;
 }
 return <section className="tr-marketing-upgrade"><h1>Google Reviews is not part of your account</h1><p>You can still manage your stands and orders.</p><div className="flex flex-wrap gap-3"><Link className="tr-button-primary" href="/google-reviews">See Google Reviews</Link><Link className="tr-button-ghost" href="/account/orders">View orders</Link></div></section>;
}
export async function MarketingGate({email,children}:{email:string;children:React.ReactNode}){
 let endedAt:string|null=null;
 try{const state=await getCustomerMarketingState(email);if(state.allowed)return state.onboardingCompleted?<>{children}</>:<FirstLoginSetup>{children}</FirstLoginSetup>;endedAt=state.endedAt;}
 catch{return <section className="tr-marketing-upgrade"><h1>Package access unavailable</h1><p>Please reload in a moment. Your stands and orders are still available.</p></section>;}
 return <MarketingUpgrade endedAt={endedAt}/>;
}
