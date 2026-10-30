import Image from "next/image";
import { ArrowUpRight, Globe, Star } from "lucide-react";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import { multiLinkDemoImage } from "@/lib/marketing-images";
import styles from "./multi-link-demo-visual.module.css";

export function MultiLinkDemoVisual() {
  return <div className={styles.scene} role="img" aria-label="Rate Your Experience stand beside a phone showing an example Multi-Link landing page for your business">
    <div className={styles.stand}><Image src={optimizedUploadSrc(multiLinkDemoImage.src,640)} alt="" fill unoptimized sizes="(max-width: 767px) 50vw, 300px" /></div>
    <div className={styles.phone} aria-hidden="true">
      <div className={styles.status}><span>9:41</span><span>••• ▰</span></div>
      <div className={styles.island} />
      <div className={styles.screen}>
        <span className={styles.logo}>Your logo</span>
        <strong>Your business</strong>
        <p>Thanks for choosing us!<br />How did we do?</p>
        <div className={styles.links}>
          <div><Star /><span>Google Review</span><ArrowUpRight /></div>
          <div><Star /><span>Yelp</span><ArrowUpRight /></div>
          <div><Globe /><span>Website</span><ArrowUpRight /></div>
        </div>
        <small>Powered by Tap Rater</small>
      </div>
    </div>
  </div>;
}

export function HowItWorksHeroVisual() {
  return <div className={styles.scene} role="img" aria-label="Custom Google Review stand beside a phone showing the Google review page">
    <div className={styles.stand}><Image src={optimizedUploadSrc("/uploads/products/taprater-stands/google/google-custom-angled.png",640)} alt="" fill unoptimized sizes="(max-width: 767px) 50vw, 300px" /></div>
    <div className={styles.reviewPhone}><Image src="/assets/google-review-phone.png" alt="" fill unoptimized sizes="(max-width: 767px) 40vw, 220px" /></div>
  </div>;
}
