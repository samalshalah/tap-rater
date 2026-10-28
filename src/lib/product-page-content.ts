import { getProductDestinationCopy } from "./product-destination-copy";
export { getProductDestinationCopy } from "./product-destination-copy";
import type { MigratedProduct } from "@/data/migrated-products";
import { formatPrice } from "@/lib/products";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";
import { correctKnownPurchaseCopy, getProductPurchaseOptions } from "@/lib/purchase-options";

export type ProductPageContentItem = {
  title: string;
  body: string;
};

export type ProductComparisonRow = {
  label: "Stand" | "Branded" | "Custom" | "Direct link";
  bestFor: string;
  fit: string;
  active: boolean;
};

export type ProductActivationCopy = {
  title: string;
  body: string;
};

export function getProductServiceBadges(product: MigratedProduct): string[] {
  if (product.requiresLandingPage || product.serviceMode === "hosted_landing_page") {
    const badges = new Set<string>();
    if (product.requiresAccount) {
      badges.add("Account required");
    }
    badges.add("Hosted landing page required");
    if (product.requiresSubscription) {
      badges.add("Subscription required");
    }
    return Array.from(badges);
  }

  const badges = new Set<string>();
  badges.add("One-time direct setup");
  if (product.requiresAccount) {
    badges.add("Account required");
  }

  if (product.serviceMode === "managed_redirect") {
    badges.add("Managed setup included");
  } else {
    badges.add("Free basic activation");
  }

  return Array.from(badges);
}

export function getProductActivationCopy(product: MigratedProduct): ProductActivationCopy {
  if (product.serviceMode === "managed_redirect") {
    return {
      title: "Managed direct stand setup",
      body:
        "This one-time product connects directly to the destination you choose after Tap Rater confirms your setup and artwork."
    };
  }

  return {
    title: "Direct link setup",
    body:
      "This one-time product connects directly to your review, booking, social, menu, feedback, or business link."
  };
}

export function getProductPageHighlights(product: MigratedProduct): ProductPageContentItem[] {
  if (product.keyFeatures?.length) {
    return product.keyFeatures.map((feature) => {
      const body = correctKnownProductDetailCopy(product, feature.body);
      return {
        ...feature,
        title: body !== feature.body && ["Tap + Scan", "Tap or scan ready"].includes(feature.title) ? "NFC tap" : feature.title,
        body
      };
    });
  }

  if (product.productKind === "hosted_multilink" || product.requiresLandingPage || product.serviceMode === "hosted_landing_page") {
    return [
      {
        title: "NFC tap",
        body: "NFC opens your hosted Tap Rater page. Printed QR is included with Branded stands."
      },
      {
        title: "Multiple customer links",
        body: "Use one stand for review, menu, booking, social, website, offer, and other important links."
      },
      {
        title: "Hosted Tap Rater page",
        body: "Your links live on a hosted page designed for quick customer actions from a phone."
      },
      {
        title: "Branded stand setup",
        body: "Add your business name and logo so the stand matches the customer-facing page."
      }
    ];
  }

  const destination = getProductDestinationCopy(product);

  return [
    {
      title: "NFC tap",
      body: getProductConnectionCopy(product)
    },
    {
      title: "Connects to one destination URL",
      body: `Use the ${destination.linkType} you approve for this stand. NFC and the printed QR code open that same destination.`
    },
    {
      title: "Countertop physical product",
      body: "Built for checkout counters, reception desks, host stands, pickup areas, and service desks."
    },
    {
      title: "Simple customer prompt",
      body: getCustomerPromptCopy(product)
    }
  ];
}

export function getProductPageUseCases(_product: MigratedProduct): ProductPageContentItem[] {
  return [
    {
      title: "Restaurants and cafes",
      body: "Place it near the register, host stand, pickup counter, or table service station."
    },
    {
      title: "Salons and clinics",
      body: "Offer the tap prompt after a completed appointment while the visit is still fresh."
    },
    {
      title: "Retail stores",
      body: "Use it beside checkout or customer service where buyers already pause."
    },
    {
      title: "Local services",
      body: "Give technicians, reception teams, and service counters a consistent customer prompt."
    }
  ];
}

export function getProductComparisonRows(product: MigratedProduct): ProductComparisonRow[] {
  return [
    {
      label: "Stand",
      bestFor: "Counters, reception, checkout, pickup",
      fit: "Visible countertop prompt",
      active: product.format === "stand"
    },
    {
      label: "Branded",
      bestFor: "Business name, uploaded logo, and QR code",
      fit: "Approve artwork preview before payment",
      active: product.allowsLogoUpload
    },
    {
      label: "Direct link",
      bestFor: "One approved URL",
      fit: "One-time direct setup",
      active: product.serviceMode === "basic_redirect" || product.serviceMode === "managed_redirect"
    },
    {
      label: "Custom",
      bestFor: "Custom branding and direct custom URLs",
      fit: "Best for branded prompts",
      active: product.categorySlug === "custom-stands"
    }
  ];
}

export function getReviewDestination(product: MigratedProduct): string {
  return getProductDestinationCopy(product).label;
}

export function getProductHowItWorks(product: MigratedProduct): Array<ProductPageContentItem & { step: number }> {
  if (product.howItWorks?.length) {
    return product.howItWorks.map((step) => ({ ...step, body: correctKnownProductDetailCopy(product, step.body) }));
  }

  if (product.productKind === "hosted_multilink" || product.requiresLandingPage || product.serviceMode === "hosted_landing_page") {
    return [
      { step: 1, title: "Choose Multi-Link", body: "Start with the hosted Multi-Link stand product." },
      { step: 2, title: "Add your links", body: "Prepare the review, menu, booking, social, website, offer, or custom links you want customers to open." },
      { step: 3, title: "Approve branded setup", body: "Add your business details and approve the stand and hosted page before launch." }
    ];
  }

  return product.howItWorks?.length
    ? product.howItWorks
    : [
        { step: 1, title: "Choose your setup", body: "Select the available design option for this product." },
        { step: 2, title: "Add your destination link", body: "Provide the URL customers should open." },
        { step: 3, title: "Place it on your counter", body: "Use the finished stand where customers already pause." }
      ];
}

export function getProductSpecifications(product: MigratedProduct) {
  return (product.specifications ?? []).map((specification) =>
    ["Connectivity", "Connection", "Technology"].includes(specification.label) && ["NFC + QR", "NFC and QR", "NFC & QR"].includes(specification.value)
      ? { ...specification, value: "NFC and printed QR, personalized with your logo and business name." }
      : specification);
}

export function getProductIncludedItems(product: MigratedProduct) {
  return (product.includedItems ?? []).map((item) =>
    ["Printed QR", "Printed QR code", "QR code"].includes(item.label)
      ? { ...item, appliesTo: "branded" as const }
      : item);
}

export function getProductFaqs(product: MigratedProduct) {
  const subscriptionQuestion = "Does this require a subscription?";
  const subscriptionAnswer = getProductSubscriptionAnswer(product);
  const faqs = product.productFaqs?.length
    ? product.productFaqs
    : [
        {
          question: `How does ${product.title} work?`,
          answer: getProductConnectionCopy(product)
        },
        {
          question: subscriptionQuestion,
          answer: subscriptionAnswer
        }
      ];

  const hasSubscriptionQuestion = faqs.some((faq) => faq.question.trim().toLowerCase() === subscriptionQuestion.toLowerCase());
  const resolvedFaqs = faqs.map((faq) => faq.question.trim().toLowerCase() === subscriptionQuestion.toLowerCase()
    ? { ...faq, answer: subscriptionAnswer }
    : { ...faq, answer: correctKnownProductDetailCopy(product, faq.answer) });

  return !hasSubscriptionQuestion && (productSupportsMultiLink(product) || product.requiresSubscription)
    ? [...resolvedFaqs, { question: subscriptionQuestion, answer: subscriptionAnswer }]
    : resolvedFaqs;
}

export function getProductSubscriptionAnswer(product: MigratedProduct): string {
  const monthlyPrice = formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents);
  if (product.requiresSubscription || product.productKind === "hosted_multilink") {
    return `Hosted Multi-Link requires a ${monthlyPrice}/month subscription per page, separate from the physical stand price. Your page supports up to ${hostedMultiLinkServiceAddon.maxLinks} links and is managed through your Tap Rater account.`;
  }

  const directAnswer = "Direct stands are a one-time purchase with no monthly subscription.";
  return productSupportsMultiLink(product)
    ? `${directAnswer} Adding hosted Multi-Link costs ${monthlyPrice}/month per page, in addition to the physical stand price. It requires a Tap Rater account and supports up to ${hostedMultiLinkServiceAddon.maxLinks} editable links.`
    : directAnswer;
}

function getProductConnectionCopy(product: MigratedProduct): string {
  const destination = getProductDestinationCopy(product);
  const brandedAvailable = getProductPurchaseOptions(product).some((option) => option.id === "branded_qr_direct");
  return `Customers tap NFC to open your ${destination.highlightTarget} without searching. Your custom stand includes a printed QR code generated from the same destination.`;
}

function correctKnownProductDetailCopy(product: MigratedProduct, value: string): string {
  if (value === "A clear physical prompt helps staff invite customers to share their experience at the right moment.") {
    return getCustomerPromptCopy(product);
  }
  const knownConnectionClaims = [
    "Customers can tap with NFC or scan the printed QR code.",
    "NFC and QR both open the same Google review link you provide.",
    "Customers tap the stand with an NFC-enabled phone or scan the QR code. Both open the Google review link you provide.",
    "Customers tap or scan the stand. It opens the direct destination link configured for your business.",
    "Customers use their phone NFC or camera.",
    "Tap Rater programs the NFC and prepares the QR code before shipping."
  ];
  return knownConnectionClaims.includes(value) ? getProductConnectionCopy(product) : correctKnownPurchaseCopy(value);
}

function getCustomerPromptCopy(product: MigratedProduct): string {
  const destination = getProductDestinationCopy(product);
  return `Give customers a direct way to open your ${destination.highlightTarget} when they need it.`;
}
