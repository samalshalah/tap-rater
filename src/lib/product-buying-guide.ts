import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { productBuyingGuides } from "@/data/product-buying-guides";
import { getProductFaqs } from "@/lib/product-page-content";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { resolveProductSeo } from "@/lib/product-seo";

export function getProductBuyingGuide(product: MigratedProduct) {
  return productBuyingGuides[product.slug];
}

export function getProductBuyingFaqs(product: MigratedProduct) {
  const guide = getProductBuyingGuide(product);
  const existing = getProductFaqs(product);
  if (!guide) return existing;
  const brandedAvailable = getProductPurchaseOptions(product).some((option) => option.id === "branded_qr_direct");
  const additions = [
    { question: guide.question, answer: guide.answer },
    {
      question: "Which design includes a printed QR code?",
      answer: brandedAvailable
        ? "Every custom stand includes NFC, a destination-generated QR code, your logo, and business name. Review the artwork preview before payment so the design and destination match your business."
        : "This custom design is currently unavailable. Browse available custom stands for your logo and QR code."
    },
    {
      question: "How should I test the stand when it arrives?",
      answer: "Tap the NFC area with a compatible phone, then check the destination as a customer would see it. Also scan the printed QR with a phone camera. Confirm the business identity and complete any relevant sign-in steps before putting the stand on display."
    }
  ];
  const questions = new Set(existing.map((faq) => faq.question.trim().toLowerCase()));
  const missing = additions.filter((faq) => !questions.has(faq.question.trim().toLowerCase()));
  // Keep curated/admin FAQs intact; fill short sets without repeating buying advice.
  const availableSlots = existing.length === 5 ? 1 : Math.max(0, 5 - existing.length);
  return [...existing, ...missing.slice(0, availableSlots)];
}

export function resolveProductPageSeo(product: MigratedProduct) {
  const seo = resolveProductSeo(product);
  const guide = getProductBuyingGuide(product);
  const catalogProduct = migratedProducts.find((candidate) => candidate.slug === product.slug);
  // Refresh seeded descriptions without replacing a merchant's custom SEO text.
  if (guide && (!product.seoDescription?.trim() || product.seoDescription === catalogProduct?.seoDescription)) {
    const firstSentence = guide.introduction.split(/(?<=\.)\s+(?=[A-Z])/)[0];
    const description = firstSentence.length <= 158
      ? firstSentence
      : `${firstSentence.slice(0, 155).replace(/\s+\S*$/, "")}…`;
    return { ...seo, description, generatedDescription: description, isDescriptionCustom: false };
  }
  return seo;
}
