import Image from "next/image";
import type { MigratedProduct } from "@/data/migrated-products";

const productImageFallback = {
  src: "/uploads/products/no-photo-available.png",
  alt: "Product image coming soon"
};

export function ProductGallery({ product }: { product: MigratedProduct }) {
  const image = product.images[0] ?? { ...productImageFallback, alt: product.title };

  return (
    <div className="lg:sticky lg:top-28">
      <div className="relative aspect-square overflow-hidden rounded-md border border-line bg-gray-50">
        <Image src={image.src} alt={image.alt} fill priority unoptimized className="object-contain p-8" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs font-bold uppercase text-muted">
        <div className="rounded-md border border-line bg-white px-3 py-3">NFC enabled</div>
        <div className="rounded-md border border-line bg-white px-3 py-3">Tap ready</div>
        <div className="rounded-md border border-line bg-white px-3 py-3">Business use</div>
      </div>
    </div>
  );
}
