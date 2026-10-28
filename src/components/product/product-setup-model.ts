import { getHostedButtonMark, hostedPageButtonLimit, supportedHostedPageButtons, type HostedPageEditorButtonType } from "@/lib/hosted-page-editor-shared";
import { type PurchaseOption } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";
import type { MultiLinkDraftButton, ProductSetupChooserProduct } from "./product-setup-chooser-types";
export function getSelectedOptionImage(product: ProductSetupChooserProduct, option: PurchaseOption): { src: string; alt: string } {
  if (option.id === "branded_qr_direct" && product.assetSet?.brandedAngledImageUrl) {
    return { src: product.assetSet.brandedAngledImageUrl, alt: `${product.title} branded option` };
  }

  return option.id === "branded_qr_direct" ? getProductVisual(product) : product.images[0] ?? { src: "/uploads/products/no-photo-available.png", alt: product.title };
}

export function isGoogleReviewStand(product: ProductSetupChooserProduct) {
  const searchableText = `${product.slug} ${product.title} ${product.categorySlug} ${product.destinationType ?? ""} ${product.primaryPlatformSlug ?? ""}`.toLowerCase();
  return searchableText.includes("google") && searchableText.includes("review");
}

export function getOptionSummary(option: PurchaseOption) {
  if (option.id === "hosted_multilink") {
    return "Hosted page with up to 10 links";
  }

  if (option.id === "branded_qr_direct") {
    return "Preview and approve before payment";
  }

  return "Direct to your destination link";
}

export function getOptionShortSummary(option: PurchaseOption) {
  if (option.id === "hosted_multilink") {
    return "Review, menu, booking, social, and website links";
  }

  if (option.id === "branded_qr_direct") {
    return "Your logo + business name + QR";
  }

  return "Ready-made stand design";
}

export function getOptionDisplayLabel(option: PurchaseOption) {
  if (option.id === "hosted_multilink") {
    return "Multi-Link";
  }

  if (option.id === "branded_qr_direct") {
    return "Branded + QR";
  }

  return option.label;
}

export function createInitialMultiLinkButtons(): MultiLinkDraftButton[] {
  return [
    createMultiLinkButton("website", 0),
    createMultiLinkButton("google_review", 1),
    createMultiLinkButton("instagram", 2)
  ];
}

export function createMultiLinkButton(type: HostedPageEditorButtonType, position: number): MultiLinkDraftButton {
  return {
    id: createMultiLinkButtonId(),
    type,
    label: getHostedButtonLabel(type),
    url: "",
    enabled: true,
    position
  };
}

export function createMultiLinkButtonId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `link-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getHostedButtonLabel(type: HostedPageEditorButtonType) {
  return supportedHostedPageButtons.find((button) => button.type === type)?.label ?? "Custom Link";
}

export function getHostedButtonSymbol(type: HostedPageEditorButtonType) {
  return getHostedButtonMark(type).text;
}

export function formatPreviewUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return trimmed;
  }
}

export function normalizeMultiLinkButtonsForSetup(buttons: MultiLinkDraftButton[]): { buttons: MultiLinkDraftButton[]; error?: string } {
  const normalized: MultiLinkDraftButton[] = [];

  for (const [index, button] of buttons.entries()) {
    const label = button.label.trim();
    const url = button.url.trim();

    if (!label && !url) continue;
    if (!label || !url) {
      return { buttons: [], error: `Complete or remove Multi-Link row ${index + 1}.` };
    }
    if (!isHttpUrl(url)) {
      return { buttons: [], error: `Enter a valid URL for Multi-Link row ${index + 1}.` };
    }

    normalized.push({
      id: button.id,
      type: button.type,
      label,
      url,
      enabled: true,
      position: normalized.length
    });
  }

  return { buttons: normalized.slice(0, hostedPageButtonLimit) };
}

export function formatSizeLabel(label: string) {
  if (label.toLowerCase().includes("a4")) {
    return "Large - A4";
  }

  return label;
}

export function platformMark(product: ProductSetupChooserProduct) {
  const platform = product.primaryPlatformSlug?.trim();
  if (platform === "google") return "G";
  if (platform === "yelp") return "Y";
  if (platform === "tripadvisor") return "T";
  if (platform === "facebook") return "f";
  return product.displayText?.slice(0, 1).toUpperCase() || "T";
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
