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
  templateVersion: "2026-08-27.2",
  widthPx: 1278,
  heightPx: 1949,
  dpi: 300,
  widthIn: 4.26,
  heightIn: 6.4967,
  safeMarginPx: 64,
  logoRegion: { xPercent: 30.5946791862, yPercent: 5.7978450487, widthPercent: 38.8106416275, heightPercent: 7.1328886609 },
  businessNameRegion: { xPercent: 26.0563380282, yPercent: 16.0595177014, widthPercent: 47.8873239437, heightPercent: 4.87429451 },
  qrRegion: { xPercent: 63.6932707355, yPercent: 69.3689061057, widthPercent: 19.2488262911, heightPercent: 12.6218573628 }
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
