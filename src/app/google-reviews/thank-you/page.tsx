import Link from 'next/link';
import {ArrowRight, Mail} from 'lucide-react';
import styles from './thank-you.module.css';
export const metadata={title:'Set up Google Reviews',robots:{index:false,follow:false}};
export default function Page(){return <main className={styles.page}><section className={styles.card}>
 <div className={styles.intro}><span className={styles.icon}><Mail size={26} strokeWidth={1.5} aria-hidden="true"/></span><p className="tr-eyebrow">GOOGLE REVIEWS</p><h1>Next, set up your workspace.</h1><p>Once payment is confirmed, we’ll email your activation link. Open it to create your password and start setup.</p><p className={styles.note}>Already activated? <Link href="/account/reviews">Continue to Reviews <ArrowRight size={14} aria-hidden="true"/></Link></p></div>
 <div className={styles.steps}><h2>Three simple steps</h2><ol>{[['Check your inbox','Open the Tap Rater activation email and create your password.'],['Continue with your business','Confirm your saved business, or add it in Locations and connect Google if you skipped that step.'],['Import your reviews','Bring in your reviews, then prepare and edit reply drafts.']].map(([title,body],i)=><li key={title}><span>{i+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol><p className={styles.help}>No email yet? Allow a few minutes and check spam.<br/><Link href="/support">Get help with setup</Link></p></div>
 </section></main>}
