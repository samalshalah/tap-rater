import { ResponsiveUpload } from "@/components/storefront/responsive-upload";
import type { GalleryImage } from "@/lib/product-gallery";
import styles from "./gallery-slide.module.css";

export function GallerySlide({ image }: { image: GalleryImage }) {
  if (!image.panel) return <ResponsiveUpload src={image.src} fallbackWidth={1200}
    sizes="(max-width: 639px) 292px, (max-width: 767px) 390px, (max-width: 1023px) 430px, 500px"
    alt={image.alt} loading="eager" fetchPriority="high" className="object-contain" />;
  return <div className={styles.panel}>
    <div className={styles.content}>
      <p className={styles.eyebrow}>TAP RATER · CUSTOM</p>
      <h2 className={styles.heading}>{image.panel.heading}</h2>
      <div className={styles.body}>
        <div className={styles.artwork}>
          <ResponsiveUpload src={image.src} fallbackWidth={640} sizes="(max-width: 639px) 120px, 200px" alt={image.alt} loading="eager" className="object-contain" />
        </div>
        <div className={styles.items}>{image.panel.items.map(item => <div key={item.title}>
          <h3>{item.title}</h3><p>{item.body}</p>
        </div>)}</div>
      </div>
      <p className={styles.footer}>Shown with customization placeholders.</p>
    </div>
  </div>;
}
