import type { MigratedProduct } from "@/data/migrated-products";
import type { PurchaseOptionId } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";
import customProductGalleries from "@/data/custom-product-galleries.json";

export type GalleryImage = {
  id?: string;
  src: string;
  alt: string;
  caption?: string;
  label?: string;
  panel?: { heading: string; items: { title: string; body: string }[] };
};

export function galleryImageKey(image: GalleryImage) { return image.id ?? image.src; }

function placementFor(product: MigratedProduct) {
  const slug = product.slug;
  if (/patient|healthgrades|vitals|ratemds|opencare|caredash|zocdoc/.test(slug)) return "Place it at reception or checkout, where patients can open your chosen link on their own phone.";
  if (/airbnb|vrbo|hotels|agoda|tripadvisor/.test(slug)) return "Place it at the welcome desk or guest information area, with the front facing arriving or departing guests.";
  if (/menu|order|ubereats/.test(slug)) return "Place it at the ordering counter or pickup area, where customers can open your menu or ordering destination.";
  if (/follow|connect|social/.test(slug)) return "Place it beside your checkout or reception desk so visitors can find your social profile while they are with you.";
  if (/zillow|realtor|homes-|apartments|trulia/.test(slug)) return "Place it at a reception desk, leasing office or open-house information table, facing visitors.";
  if (/cars-|autotrader|cargurus|dealerrater|edmunds|carfax/.test(slug)) return "Place it at the showroom reception or service counter, where customers finish their visit.";
  if (/fresha|booksy|vagaro|styleseat/.test(slug)) return "Place it at the salon reception or checkout counter so clients can open your chosen business page.";
  return "Place it at a customer-facing counter or reception desk, with the front easy to see and reach.";
}

// Information panels keep the original artwork intact. They are website content,
// not newly generated product photos or claims about a different stand.
export function getCustomGallery(product: MigratedProduct): GalleryImage[] {
  const src = product.assetSet?.brandedAngledImageUrl;
  if (!src) return [];
  const front = product.assetSet?.brandedFrontTemplateUrl;
  const name = product.title.replace(/ Stand$/i, "");
  const panel = (id: string, label: string, heading: string, items: { title: string; body: string }[]): GalleryImage => ({
    id, label, src, alt: `${product.title} custom design — ${label.toLowerCase()}`,
    caption: `${name} · ${label}`, panel: { heading, items }
  });
  return [
    { id: "custom-angled", label: "Custom stand", src, alt: `${product.title} custom angled design`, caption: `${name} with your logo, business name and printed QR code.` },
    panel("customize", "Make it yours", "Made for your business", [
      { title: "1 · Upload your logo", body: "Use the logo you want printed on this stand." },
      { title: "2 · Add your name", body: "Enter your business name as it should appear." },
      { title: "3 · Choose your link", body: `Provide the destination for your ${name} stand.` }
    ]),
    ...(front ? [{ id: "custom-front", label: "Front artwork", src: front, alt: `${product.title} custom front artwork with personalization placeholders`, caption: "Flat front artwork preview. Placeholder areas are personalized for your order." }] : []),
    panel("tap-scan", "Tap or scan", "Two ways to connect", [
      { title: "Tap with NFC", body: "Customers hold a compatible phone near the NFC area." },
      { title: "Scan your QR", body: "The printed QR code opens the same approved destination." },
      { title: "Your chosen page", body: `Both routes open the link you supply for ${name}.` }
    ]),
    panel("placement", "Where to place it", "Ready for your counter", [
      { title: name, body: placementFor(product) },
      { title: "Keep it within reach", body: "Leave enough space for a phone to tap or scan the front." }
    ]),
    panel("details", "Stand details", "Your custom design", [
      { title: "Your own branding", body: "Your logo and business name personalize the existing design." },
      { title: "NFC + printed QR", body: "Two ways to open one destination on a compatible phone." },
      { title: "Review your proof", body: "Check the design and destination during setup before approving your order." }
    ]),
    panel("personalization", "Your branding", "Your brand. Your link.", [
      { title: "Logo + business name", body: "The placeholders show where your details will appear." },
      { title: "Your QR code", body: "We generate the printed QR from your approved destination link." },
      { title: "Finished for you", body: "Placeholder text is replaced on your finished stand." }
    ])
  ];
}

// Add approved images for an existing product/option here. Never reuse another
// stand's artwork or put custom photographs in the standard gallery.
export const productGalleries: Record<string, Partial<Record<PurchaseOptionId, GalleryImage[]>>> = {
  "google-review-stand": {
    branded_qr_direct: [
      ["01-white-background-angled", "Custom Google Review stand with red logo, company name and QR placeholders", "Custom Google stand — personalized with your logo, business name and review QR code."],
      ["02-customization-steps", "How to personalize the Google stand with your business details", "Add your logo, business name and Google review link."],
      ["03-front-product", "Front view of the custom Google Review stand", "Front view of the custom design."],
      ["04-tap-or-scan", "NFC tap and QR scan options on the custom Google stand", "Customers can tap with NFC or scan your printed QR code."],
      ["05-countertop-scene", "Custom Google Review stand illustrated on a reception counter", "Illustrative countertop setting."],
      ["06-acrylic-detail", "Rounded corners and base of the custom acrylic Google stand", "A closer look at the acrylic stand and countertop base."],
      ["07-personalization-detail", "Logo, business name and review QR customization areas", "Red placeholders show where your business details will go; they are replaced on your finished stand."]
    ].map(([name, alt, caption]) => ({ src: `/product-galleries/google-custom/tap-rater-custom-google-review-stand-${name}.webp`, alt, caption }))
  }
};

export function getGalleryImages(product: MigratedProduct, optionId: PurchaseOptionId = "standard_direct"): GalleryImage[] {
  if (optionId === "branded_qr_direct") {
    const custom = (customProductGalleries as Record<string, GalleryImage[]>)[product.slug];
    if (custom?.length) return custom;
  }
  const configured = productGalleries[product.slug]?.[optionId];
  if (configured?.length) return configured;
  const assets = product.assetSet;
  if (optionId === "branded_qr_direct") return getCustomGallery(product);
  if (optionId === "hosted_multilink") {
    const src = assets?.multiLinkAngledImageUrl;
    // No standard-photo fallback: it would misrepresent the selected design.
    return src ? [{ src, alt: `${product.title} Multi-Link design`, caption: "Personalized layout example." }] : [];
  }
  const excluded = new Set([assets?.standardFrontTemplateUrl, assets?.brandedFrontTemplateUrl, assets?.multiLinkFrontTemplateUrl,
    assets?.brandedAngledImageUrl, assets?.multiLinkAngledImageUrl].filter(Boolean));
  const main = assets?.standardAngledImageUrl ? { src: assets.standardAngledImageUrl, alt: `${product.title} standard design` } : getProductVisual(product);
  const seen = new Set<string>();
  return [main, ...product.images].filter(item => {
    if (!item.src || excluded.has(item.src) || seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  }).map((item, index) => ({ ...item, alt: item.alt.trim() || `${product.title} gallery view ${index + 1}` }));
}
