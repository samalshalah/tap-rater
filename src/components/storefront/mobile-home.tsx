import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, MessageSquare, Share2, ShieldCheck, Utensils } from "lucide-react";
import type { MigratedProduct } from "@/data/migrated-products";
import { getProductVisual } from "@/lib/storefront-visuals";
import { getLowestPurchasePriceCents } from "@/lib/purchase-options";
import { formatPrice } from "@/lib/products";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

export function MobileHome({ product }: { product?: MigratedProduct }) {
  const image = product ? getProductVisual(product) : null;
  return <section className="tr-mobile-home" aria-label="Shop Tap Rater stands">
    <p className="tr-mobile-home-title">One tap. More connections.</p>
    <p>Stands for reviews, menus &amp; more.</p>
    {image ? <div className="tr-mobile-home-image"><Image src={optimizedUploadSrc(image.src, 640)} alt={image.alt} fill unoptimized priority sizes="(max-width: 767px) 100vw, 1px" className="object-contain" /></div> : null}
    <Link href="/shop" className="tr-mobile-primary">Shop stands <ArrowRight size={22} aria-hidden="true" /></Link>
    <div className="tr-mobile-actions">{[{ title: "Reviews", href: "/category/reviews", icon: MessageSquare }, { title: "Menus", href: "/category/menu", icon: Utensils }, { title: "Social", href: "/category/social-media", icon: Share2 }].map(({ title, href, icon: Icon }) => <Link key={title} href={href}><span><Icon size={26} aria-hidden="true" /></span>{title}</Link>)}</div>
    {product && image ? <Link href={`/product/${product.slug}`} className="tr-mobile-featured"><Image src={optimizedUploadSrc(image.src, 160)} alt="" width={64} height={64} unoptimized /><span><strong>{product.title}</strong><small>From {formatPrice(getLowestPurchasePriceCents(product)).replace(".00", "")}</small></span><ChevronRight size={20} aria-hidden="true" /></Link> : null}
    <div className="tr-mobile-proof"><ShieldCheck size={21} aria-hidden="true" />Direct stands. No subscription.</div>
  </section>;
}
