import { shortProductTitle } from "@/lib/branded-product-title";
import type { MigratedProduct } from "@/data/migrated-products";
import { getProductDestinationCopy } from "@/lib/product-destination-copy";

export const nfcProductFaqs = [
  {
    question: "How do customers use NFC or the QR code?",
    answer: "NFC means Near Field Communication. Hold an unlocked, NFC-enabled phone close to the stand's NFC area and open the link notification if prompted. The phone's reading position varies by model; NFC may need enabling in its settings. If tapping is unavailable, scan the printed QR code with the phone camera. Both open the destination you supply. No Tap Rater app is required, though the destination may ask customers to sign in."
  },
  {
    question: "Does the stand need power, Wi-Fi or charging?",
    answer: "No. The passive NFC tag is powered briefly by the phone, so the stand needs no battery, charging or Wi-Fi connection. Customers need mobile data or Wi-Fi on their phone to load the linked website. Phone compatibility and settings affect NFC reading; the QR code provides an alternative."
  }
];

export function brandedProductDescription(product: MigratedProduct) {
  const destination = getProductDestinationCopy(product);
  const name = shortProductTitle(product.title).replace(/^Custom /, "");
  const shortDescription = `Personalize your ${name} with a custom design featuring your business logo, name and QR code. Customers tap with an NFC-enabled phone or scan the QR code to open your ${destination.linkType}.`;
  const seoDescription = `Custom ${name} with your business logo and name. NFC tap and QR code. Personalize your design and preview before payment.`;
  return {
    shortDescription,
    description: `${shortDescription} Add your destination link and logo during setup, then approve your artwork before payment. The NFC tag and printed QR code are prepared for the same destination. NFC (Near Field Communication) works at close range with compatible phones; customers can use their camera to scan the QR code instead. No Tap Rater app is needed. The stand needs no battery or charging; the phone needs internet access to load your linked page. Direct-link stands have no subscription.`,
    seoDescription: seoDescription.length <= 158 ? seoDescription : `Custom ${name} with your business logo, name, NFC tap and QR code. Preview before payment.`
  };
}
