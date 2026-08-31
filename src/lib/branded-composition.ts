export type BrandedCompositionRegion = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export type BrandedCompositionGeometry = {
  templateId: string;
  templateVersion: string;
  widthPx: number;
  heightPx: number;
  dpi: number;
  widthIn: number;
  heightIn: number;
  safeMarginPx: number;
  logoRegion: BrandedCompositionRegion;
  businessNameRegion: BrandedCompositionRegion;
  qrRegion: BrandedCompositionRegion;
};

export const brandedStandComposition: BrandedCompositionGeometry = {
  templateId: "taprater-branded-stand-front",
  templateVersion: "2026-08-31.1",
  widthPx: 1278,
  heightPx: 1949,
  dpi: 300,
  widthIn: 4.26,
  heightIn: 6.4967,
  safeMarginPx: 64,
  logoRegion: { xPercent: 26.2128325509, yPercent: 4.8742945100, widthPercent: 47.7308294209, heightPercent: 7.1831708568 },
  businessNameRegion: { xPercent: 22.3787167449, yPercent: 19.4971780400, widthPercent: 55.2425665102, heightPercent: 4.3612108774 },
  qrRegion: { xPercent: 61.82, yPercent: 68.3, widthPercent: 22.5, heightPercent: 14.78 }
};

export function regionToPixels(
  region: BrandedCompositionRegion,
  widthPx = brandedStandComposition.widthPx,
  heightPx = brandedStandComposition.heightPx
) {
  return {
    x: Math.round((region.xPercent / 100) * widthPx),
    y: Math.round((region.yPercent / 100) * heightPx),
    width: Math.round((region.widthPercent / 100) * widthPx),
    height: Math.round((region.heightPercent / 100) * heightPx)
  };
}
