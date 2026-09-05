export type OptimizedUploadWidth = 160 | 640 | 1200;

const localUploadPattern = /^\/uploads\/(.+)\.(?:png|jpe?g|webp)$/i;

export function optimizedUploadSrc(src: string, width: OptimizedUploadWidth) {
  const suffixIndex = src.search(/[?#]/u);
  const pathname = suffixIndex === -1 ? src : src.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : src.slice(suffixIndex);
  const match = pathname.match(localUploadPattern);
  if (!match) return src;

  return `/uploads-optimized/${match[1]}-w${width}.webp${suffix}`;
}
