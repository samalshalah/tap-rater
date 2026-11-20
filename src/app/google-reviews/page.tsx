import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowRight, Check, Download, FilePenLine, Send} from 'lucide-react';
import {SectionHeader, SectionShell} from '@/components/storefront/section';
import {FaqList} from '@/components/storefront/faq-list';
import {JsonLd, faqJsonLd} from '@/lib/seo';
import {ReviewsLandingPurchase} from '@/components/account/reviews-landing-purchase';
import styles from './reviews-landing.module.css';
import heroStyles from '@/components/storefront/business-pages.module.css';
import {PrismaticWave} from '@/components/prismatic/motion';

const faqs=[
 {question:'Will Tap Rater post replies to Google for me?',answer:'Only when you choose. Submit any reply to Google in one click, or turn on 4–5-star autopilot during setup to post positive replies automatically after your chosen delay. Replies to 1–3-star reviews always wait for you.'},
 {question:'What do I need to connect my business?',answer:'You need a Google account that owns or manages the Google Business Profile. Find your business and connect that Google account to see your unanswered-review breakdown before payment. Your selected location and connection are saved for setup after account activation. You keep ownership of your profile.'},
 {question:'I already have Reviews access. Should I buy again?',answer:'No. Sign in to your existing Tap Rater account to use your Reviews workspace or check Subscription management. If the location is already connected to another Tap Rater workspace, contact support before purchasing. A location cannot be connected to two workspaces.'},
 {question:'What does the monthly allowance include?',answer:'Each subscribed location includes 1,000 reply drafts per month. You can edit and save drafts before deciding whether to use them. AI drafting requires your opt-in; check every draft for accuracy and tone.'},
 {question:'Do I need to buy a Tap Rater stand?',answer:'No. Google Reviews is a standalone subscription. A physical NFC or QR stand is a separate, optional purchase for helping customers open your review page. Your stand checkout is separate from this service.'},
 {question:'Can I cancel my subscription?',answer:'Yes. Cancel future renewals in Subscription management. The subscription renews monthly until canceled, and access continues through the paid period. Final pricing and any applicable tax are shown before payment.'},
 {question:'Does this include Google Growth?',answer:'No. Google Growth, profile optimization, and ranking scans are not included. This package focuses on importing reviews and preparing reply drafts.'}
];
export const metadata:Metadata={title:'Google Reviews — Imports & Reply Drafts',description:'Bring your Google reviews into one workspace, prepare AI reply drafts and post them to Google, with optional 4–5-star autopilot. $29 per location per month.',alternates:{canonical:'/google-reviews'},openGraph:{title:'Google Reviews, in your own words | Tap Rater',description:'Import reviews. Prepare thoughtful drafts. Keep the final word.',url:'/google-reviews',type:'website'}};

export const dynamic='force-dynamic';
export default async function GoogleReviewsLanding({searchParams}:{searchParams?:Promise<{checkout?:string}>}){const params=await searchParams;return <main className="tr-public-shell text-ink">
 <JsonLd data={faqJsonLd(faqs)}/>
 <SectionShell tone="soft" spacing="compact" className={heroStyles.hero}>
  <div className={`tr-container tr-prismatic-shop-intro ${heroStyles.banner} ${heroStyles.shopBanner}`}>
   <PrismaticWave variant="banner"/>
   <p className="tr-eyebrow">Google Reviews · Imports &amp; drafts</p>
   <h1 className="tr-page-title mt-4">Your reviews. Your voice.</h1>
   <p className="mt-4 text-sm leading-6 text-muted sm:text-base">Bring your Google reviews into one workspace. Prepare thoughtful reply drafts, make them your own, and choose what to publish yourself.</p>
  </div>
 </SectionShell>
 <ReviewsLandingPurchase cancelled={params?.checkout==='cancelled'}/>
 <div className={`tr-container ${styles.promiseStrip}`}><span><Check size={17} aria-hidden="true"/>You keep the final word</span><span><Check size={17} aria-hidden="true"/>No stand required</span><span><Check size={17} aria-hidden="true"/>You choose what posts</span></div>

 <SectionShell><div className="tr-container"><SectionHeader eyebrow="A little help with every reply" title="Less time starting from scratch." body="Give each review the attention it deserves, with a clear place to read feedback and work on your response."/>
 <div className={styles.features}>{[
  {icon:Download,title:'Bring your reviews together',body:'Connect a Google Business Profile you manage and import its reviews into your Tap Rater workspace.'},
  {icon:FilePenLine,title:'Find the words, then refine them',body:'Generate reply drafts using the review text and rating. Adjust the wording and tone before saving.'},
  {icon:Send,title:'Publish on your terms',body:'Submit a reply to Google in one click, or let 4–5-star autopilot reply to positive reviews for you.'}
 ].map(({icon:Icon,title,body})=><article className={styles.feature} key={title}><span className={styles.icon}><Icon size={24} strokeWidth={1.5} aria-hidden="true"/></span><h3>{title}</h3><p>{body}</p></article>)}</div>
 </div></SectionShell>

 <SectionShell tone="soft" id="how-it-works"><div className="tr-container"><SectionHeader eyebrow="From connected to considered" title="A simple path to a better draft."/>
 <ol className={styles.steps}>{[
  ['Find and connect','Find your business, then connect the Google account that manages it. No payment is needed to see your review snapshot.'],
  ['See your reviews, then subscribe','See unanswered reviews by star rating. Enter your email and pay when you’re ready. We’ll save your business for account setup.'],
  ['Draft, edit, decide','Turn on AI replies, set your preferences, and choose 4–5-star autopilot. Review and submit everything else when you’re ready.']
 ].map(([title,body],i)=><li key={title}><span className={styles.stepNumber}>0{i+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
 <p className={styles.existing}>Already using Tap Rater Reviews? <Link href="/account/reviews">Open your workspace <ArrowRight size={15} aria-hidden="true"/></Link> Your existing account features stay as they are.</p>
 </div></SectionShell>

 <SectionShell tone="soft"><div className="tr-container"><SectionHeader align="center" eyebrow="Before you begin" title="A few things worth knowing."/><FaqList faqs={faqs}/></div></SectionShell>
 <SectionShell spacing="compact"><div className={`tr-container ${styles.closing}`}><div><h2>Make room for thoughtful replies.</h2><p>Start with your reviews. Finish with your own words.</p></div><Link href="#plan" className="tr-button-primary">Get started <ArrowRight size={17} aria-hidden="true"/></Link></div></SectionShell>
 </main>}
