import Link from "next/link";
import type { CSSProperties } from "react";
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

/** Same-size business cards (up to 5 across on desktop). Compact: shorter cards that swipe sideways on phones. */
export function BusinessShowcase({ scenes, compact = false }: { scenes: BusinessScene[]; compact?: boolean }) {
  if (!scenes.length) return null;

  return <div className={compact ? `${styles.businessGrid} ${styles.compact}` : styles.businessGrid} style={{ "--cols": Math.min(scenes.length, 5) } as CSSProperties} data-home-business-cards={compact ? undefined : true}>
    {scenes.map(scene => <Link key={scene.slug} href={`/business/${scene.slug}`} className={styles.businessCard}>
      <ResponsiveUpload src={scene.image.src} alt={scene.image.alt}
        sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 20vw" fallbackWidth={640}
        style={{ objectPosition: getBusinessUseImagePosition(scene.image.src) }} />
      <h3 className={styles.cardTitle}>{scene.title}<ArrowUpRight size={16} aria-hidden="true" /></h3>
    </Link>)}
  </div>;
}
