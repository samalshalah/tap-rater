import Link from 'next/link';
import {hasCustomerMarketingAccess} from '@/lib/customer-marketing-access';
export function MarketingUpgrade(){return <section className="tr-marketing-upgrade"><p className="tr-eyebrow">Reviews package</p><h1>Grow each location</h1><p>Add the Reviews package to access reviews, Google Profile, heat maps, directory listings and reports for your locations.</p><div className="tr-package-features">{['Reviews & draft replies','Google Profile drafts','Heat map tracking','Directory listings','Location reports','Issues & approvals'].map(label=><span key={label}>{label}</span>)}</div><p>Your stands and orders are available separately. No marketing data is loaded without package access.</p><Link className="tr-button-primary" href="/account/packages">Get the Reviews package</Link></section>}
export async function MarketingGate({email,children}:{email:string;children:React.ReactNode}){
 try{if(await hasCustomerMarketingAccess(email))return children;}
 catch{return <section className="tr-marketing-upgrade"><h1>Package access unavailable</h1><p>Please reload in a moment. Your stands and orders are still available.</p></section>;}
 return <MarketingUpgrade/>;
}
