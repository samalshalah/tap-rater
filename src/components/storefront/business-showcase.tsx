import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ResponsiveUpload } from "./responsive-upload";
import { getBusinessUseImagePosition } from "@/lib/storefront-visuals";
import styles from "./business-showcase.module.css";

export type BusinessScene = {
  slug: string;
  title: string;
  body: string;
  image: { src: string; alt: string };
};

export function BusinessShowcase({ scenes }: { scenes: BusinessScene[] }) {
  const [featured, ...others] = scenes;
  if (!featured) return null;

  return <div className={styles.showcase} data-home-business-cards>
    <article className={styles.featured}>
      <ResponsiveUpload src={featured.image.src} alt={featured.image.alt}
        sizes="(max-width: 767px) 100vw, 60vw" fallbackWidth={1200}
        style={{ objectPosition: getBusinessUseImagePosition(featured.image.src) }} />
      <div className={styles.featuredCopy}>
        <p className={styles.label}>{featured.title}</p>
        <h3 className={styles.headline}>{featured.body || featured.title}</h3>
        <Link className={styles.explore} href={`/solutions/${featured.slug}`}>
          Explore stands<ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
    {others.length ? <div className={styles.businessGrid}>
      {others.map(scene => <Link key={scene.slug} href={`/solutions/${scene.slug}`} className={styles.businessCard}>
        <ResponsiveUpload src={scene.image.src} alt={scene.image.alt}
          sizes="(max-width: 767px) 50vw, 23vw" fallbackWidth={640}
          style={{ objectPosition: getBusinessUseImagePosition(scene.image.src) }} />
        <h3 className={styles.cardTitle}>{scene.title}<ArrowUpRight size={16} aria-hidden="true" /></h3>
      </Link>)}
    </div> : null}
  </div>;
}
