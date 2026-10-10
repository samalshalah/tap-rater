import variantWidths from "@/data/upload-variant-widths.json";

export type OptimizedUploadWidth = 160 | 320 | 480 | 640 | 1200;

const localUploadPattern = /^\/uploads\/(.+)\.(?:png|jpe?g|webp)$/i;

export function optimizedUploadSrc(src: string, width: OptimizedUploadWidth) {
  const suffixIndex = src.search(/[?#]/u);
  const pathname = suffixIndex === -1 ? src : src.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : src.slice(suffixIndex);
  const match = pathname.match(localUploadPattern);
  if (!match) return src;

  return `/uploads-optimized/${match[1]}-w${width}.webp${suffix}`;
}

// Use actual encoded widths: portrait images fit inside a square and are narrower
// than the variant label. Do not advertise missing variants for dynamic uploads.
export function optimizedUploadSrcSet(src: string) {
  const pathname = src.split(/[?#]/u)[0];
  const key = pathname.startsWith("/uploads/") ? pathname.slice(9) : "";
  const dimensions = (variantWidths.sources as Record<string, number[]>)[key];
  if (!dimensions) return undefined;
  const seen = new Set<number>();
  return variantWidths.widths.flatMap((width, index) => {
    const actualWidth = dimensions[index];
    if (seen.has(actualWidth)) return [];
    seen.add(actualWidth);
    return [`${optimizedUploadSrc(src, width as OptimizedUploadWidth)} ${actualWidth}w`];
  }).join(", ");
}
