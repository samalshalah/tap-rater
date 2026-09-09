import { parse, type Font } from "opentype.js";
import fontData from "@/data/print-font/noto-sans-bold.json";
import type { ArtworkRegion, ProductionArtworkTemplate } from "@/lib/production-artwork";
import { createQrSvg } from "@/lib/qr-code";
import { brandedStandComposition, regionToPixels } from "@/lib/branded-composition";

export const printRendererVersion = "2026-09-09.1";
let printFont: Font | undefined;

function getPrintFont() {
  if (!printFont) {
    const bytes = Uint8Array.from(atob(fontData.base64), (character) => character.charCodeAt(0));
    printFont = parse(bytes.buffer);
  }
  return printFont;
}

export type PrintArtworkDesign = {
  businessName: string;
  qrTargetUrl: string;
  fontSizePercent: number;
  logoSizePercent: number;
  logoFitMode: "contain" | "fill";
  logoOffsetXPercent: number;
  logoOffsetYPercent: number;
  showBusinessName: boolean;
};

// Both the transient approval proof and the paid print file use this composition.
export async function renderPrintArtwork(input: {
  template: ProductionArtworkTemplate;
  design: PrintArtworkDesign;
  templateDataUri: string;
  logoDataUri: string;
  title: string;
  metadata: Record<string, unknown>;
}) {
  const { template, design } = input;
  const qr = await createQrSvg(design.qrTargetUrl);
  const qrBody = qr.replace(/^.*?<svg[^>]*>/s, "").replace(/<\/svg>\s*$/s, "");
  const qrViewBox = qr.match(/viewBox="([^"]+)"/)?.[1];
  if (!qrViewBox) throw new Error("QR artwork is invalid.");
  const logoRegion = getPrintLogoRegion(template.logoRegion, design);
  const namePath = design.showBusinessName ? outlineBusinessName(design.businessName, template.businessNameRegion, design.fontSizePercent) : "";
  // These catalogue templates contain red placeholders within the editable areas.
  const clearPlaceholders = /\/taprater-(?:text-)?stands\//.test(template.templateUrl)
    ? '<rect x="270" y="60" width="740" height="235" fill="white"/><rect x="270" y="300" width="740" height="185" fill="white"/>'
    : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${template.widthIn}in" height="${template.heightIn}in" viewBox="0 0 ${template.widthPx} ${template.heightPx}" role="img" aria-label="${escapeXml(input.title)}">`,
    `<title>${escapeXml(input.title)}</title>`,
    `<metadata>${escapeXml(JSON.stringify({ ...input.metadata, rendererVersion: printRendererVersion, fontSha256: fontData.sha256, widthPx: template.widthPx, heightPx: template.heightPx, dpi: template.dpi }))}</metadata>`,
    `<rect width="${template.widthPx}" height="${template.heightPx}" fill="white"/>`,
    `<image href="${escapeXml(input.templateDataUri)}" width="${template.widthPx}" height="${template.heightPx}" preserveAspectRatio="xMidYMid meet"/>`,
    clearPlaceholders,
    `<defs><clipPath id="logo-area"><rect x="${logoRegion.x}" y="${logoRegion.y}" width="${logoRegion.width}" height="${logoRegion.height}"/></clipPath></defs>`,
    `<image href="${escapeXml(input.logoDataUri)}" x="${logoRegion.x}" y="${logoRegion.y}" width="${logoRegion.width}" height="${logoRegion.height}" preserveAspectRatio="${design.logoFitMode === "fill" ? "xMidYMid slice" : "xMidYMid meet"}" clip-path="url(#logo-area)"/>`,
    namePath,
    `<svg x="${template.qrRegion.x + 8}" y="${template.qrRegion.y + 4}" width="${template.qrRegion.width - 16}" height="${template.qrRegion.height - 16}" viewBox="${escapeXml(qrViewBox)}">${qrBody}</svg>`,
    "</svg>"
  ].join("");
}

export function getPrintLogoRegion(region: ArtworkRegion, design: Pick<PrintArtworkDesign, "logoSizePercent" | "logoOffsetXPercent" | "logoOffsetYPercent">): ArtworkRegion {
  const scale = Math.min(160, Math.max(75, design.logoSizePercent)) / 100;
  const width = Math.round(region.width * scale);
  const height = Math.round(region.height * scale);
  return {
    width, height,
    x: Math.max(brandedStandComposition.safeMarginPx, Math.min(brandedStandComposition.widthPx - brandedStandComposition.safeMarginPx - width, Math.round(region.x + (region.width - width) / 2 + region.width * Math.min(20, Math.max(-20, design.logoOffsetXPercent)) / 100))),
    y: Math.max(brandedStandComposition.safeMarginPx, Math.min(regionToPixels(brandedStandComposition.businessNameRegion).y - 24 - height, Math.round(region.y + (region.height - height) / 2 + region.height * Math.min(20, Math.max(-20, design.logoOffsetYPercent)) / 100)))
  };
}

function outlineBusinessName(name: string, region: ArtworkRegion, percent: number) {
  const font = getPrintFont();
  for (const character of name) {
    if (!font.charToGlyphIndex(character)) throw new Error("The business name contains a character this print font cannot render. Contact us for custom lettering.");
  }
  const requestedSize = 68 * Math.min(160, Math.max(75, percent)) / 100;
  const measure = font.getPath(name, 0, 0, requestedSize).getBoundingBox();
  const scale = Math.min(1, region.width * 0.96 / Math.max(1, measure.x2 - measure.x1), region.height * 0.9 / Math.max(1, measure.y2 - measure.y1));
  const size = requestedSize * scale;
  if (size < 18) throw new Error("The business name is too long to print clearly. Please shorten it.");
  const bounds = font.getPath(name, 0, 0, size).getBoundingBox();
  const x = region.x + (region.width - (bounds.x2 - bounds.x1)) / 2 - bounds.x1;
  const y = region.y + (region.height - (bounds.y2 - bounds.y1)) / 2 - bounds.y1;
  const path = font.getPath(name, x, y, size).toPathData(3);
  return `<path data-business-name="${escapeXml(name)}" d="${path}" fill="#111827"/>`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
