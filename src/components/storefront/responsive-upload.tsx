import type { ImgHTMLAttributes } from "react";
import { optimizedUploadSrc, optimizedUploadSrcSet, type OptimizedUploadWidth } from "@/lib/optimized-upload";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string;
  alt: string;
  sizes: string;
  fallbackWidth?: OptimizedUploadWidth;
};

export function ResponsiveUpload({ src, alt, sizes, fallbackWidth = 640, style, loading = "lazy", ...props }: Props) {
  return <img {...props} alt={alt} sizes={sizes}
    srcSet={optimizedUploadSrcSet(src)} src={optimizedUploadSrc(src, fallbackWidth)}
    loading={loading} decoding="async"
    style={{ position: "absolute", height: "100%", width: "100%", inset: 0, ...style }} />;
}
