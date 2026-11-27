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

/** Homepage "Shop by business": one row of same-size cards (up to 5 across on desktop). */
export function BusinessShowcase({ scenes }: { scenes: BusinessScene[] }) {
  if (!scenes.length) return null;

  return <div className={styles.businessGrid} style={{ "--cols": Math.min(scenes.length, 5) } as CSSProperties} data-home-business-cards>
    {scenes.map(scene => <Link key={scene.slug} href={`/solutions/${scene.slug}`} className={styles.businessCard}>
      <ResponsiveUpload src={scene.image.src} alt={scene.image.alt}
        sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 20vw" fallbackWidth={640}
        style={{ objectPosition: getBusinessUseImagePosition(scene.image.src) }} />
      <h3 className={styles.cardTitle}>{scene.title}<ArrowUpRight size={16} aria-hidden="true" /></h3>
    </Link>)}
  </div>;
}
