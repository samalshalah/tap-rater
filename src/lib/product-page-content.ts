import type { MigratedProduct } from "@/data/migrated-products";

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
  badges.add("No monthly fee required");
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
        "This one-time product connects directly to the destination you choose after Tap Rater confirms your setup and production artwork."
    };
  }

  return {
    title: "Direct link setup",
    body:
      "This one-time product connects directly to your review, booking, social, menu, feedback, or business link. No monthly fee is required."
  };
}

export function getProductPageHighlights(product: MigratedProduct): ProductPageContentItem[] {
  const destination = getProductDestinationCopy(product);

  return [
    {
      title: "Tap or scan ready",
      body: `Customers tap or scan and open your ${destination.highlightTarget} without searching.`
    },
    {
      title: "Connects to one destination URL",
      body: "Use your business review page, recommendation page, booking page, menu, feedback form, website, or custom URL."
    },
    {
      title: "Countertop physical product",
      body: "Built for checkout counters, reception desks, host stands, pickup areas, and service desks."
    },
    {
      title: "Simple customer prompt",
      body: "A clear physical prompt helps staff invite customers to share their experience at the right moment."
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
      body: "Offer the tap or scan prompt after a completed appointment while the visit is still fresh."
    },
    {
      title: "Retail stores",
      body: "Use it beside checkout or customer service where buyers already pause."
    },
    {
      title: "Local services",
      body: "Give technicians, reception teams, and service counters a consistent review prompt."
    }
  ];
}

export function getProductComparisonRows(product: MigratedProduct): ProductComparisonRow[] {
  return [
    {
      label: "Stand",
      bestFor: "Counters, reception, checkout, pickup",
      fit: "Most visible review prompt",
      active: product.format === "stand"
    },
    {
      label: "Branded",
      bestFor: "Business name, uploaded logo, and printed QR code",
      fit: "Front proof preview before cart",
      active: product.allowsLogoUpload
    },
    {
      label: "Direct link",
      bestFor: "One approved URL",
      fit: "No subscription required",
      active: product.serviceMode === "basic_redirect" || product.serviceMode === "managed_redirect"
    },
    {
      label: "Custom",
      bestFor: "Custom UV printing and direct custom URLs",
      fit: "Best for branded prompts",
      active: product.categorySlug === "custom-stands"
    }
  ];
}

export function getReviewDestination(product: MigratedProduct): string {
  return getProductDestinationCopy(product).label;
}

type ProductDestinationCopy = {
  label: string;
  highlightTarget: string;
};

export function getProductDestinationCopy(product: MigratedProduct): ProductDestinationCopy {
  const destinationType = normalize(product.destinationType);
  const platform = normalize(product.primaryPlatformSlug);
  const standType = normalize(product.standTypeSlug);
  const category = normalize(product.categorySlug);
  const title = normalize(product.title);

  if (product.productKind === "hosted_multilink" || product.requiresLandingPage || product.serviceMode === "hosted_landing_page") {
    return {
      label: "hosted multi-link page",
      highlightTarget: "hosted Tap Rater page"
    };
  }

  const platformCopy = getPlatformDestinationCopy(platform);
  if (platformCopy) {
    return platformCopy;
  }

  const destinationCopy = getDestinationTypeCopy(destinationType);
  if (destinationCopy) {
    return destinationCopy;
  }

  if (standType.includes("review") || category === "reviews") {
    return { label: "review", highlightTarget: "review link" };
  }

  if (standType.includes("menu") || category === "menu" || title.includes("menu")) {
    return { label: "menu", highlightTarget: "menu URL" };
  }

  if (standType.includes("appointment") || category === "appointments" || title.includes("book")) {
    return { label: "booking", highlightTarget: "booking URL" };
  }

  if (standType.includes("social") || category === "social-media" || title.includes("follow") || title.includes("social")) {
    return { label: "social media", highlightTarget: "social profile" };
  }

  if (standType.includes("feedback") || category === "feedback" || title.includes("experience")) {
    return { label: "feedback", highlightTarget: "feedback form" };
  }

  if (standType.includes("website") || category === "website-links" || title.includes("website")) {
    return { label: "website", highlightTarget: "website link" };
  }

  return { label: "direct link", highlightTarget: "destination link" };
}

function getPlatformDestinationCopy(platform: string): ProductDestinationCopy | undefined {
  if (platform === "google") return { label: "Google review", highlightTarget: "Google review destination" };
  if (platform === "yelp") return { label: "Yelp review", highlightTarget: "Yelp review destination" };
  if (platform === "facebook") return { label: "Facebook review", highlightTarget: "Facebook review destination" };
  if (platform === "tripadvisor") return { label: "TripAdvisor review", highlightTarget: "TripAdvisor review destination" };
  if (platform === "instagram") return { label: "Instagram", highlightTarget: "Instagram profile" };
  if (platform === "website") return { label: "website", highlightTarget: "website link" };
  if (platform === "custom-menu-url") return { label: "menu", highlightTarget: "menu URL" };
  if (platform === "custom-booking-url") return { label: "booking", highlightTarget: "booking URL" };
  if (platform === "custom-url") return undefined;
  return undefined;
}

function getDestinationTypeCopy(destinationType: string): ProductDestinationCopy | undefined {
  if (destinationType === "review" || destinationType === "review_social") {
    return { label: "review", highlightTarget: "review link" };
  }

  if (destinationType === "menu") return { label: "menu", highlightTarget: "menu URL" };
  if (destinationType === "booking" || destinationType === "reservation") return { label: "booking", highlightTarget: "booking URL" };
  if (destinationType === "social") return { label: "social media", highlightTarget: "social profile" };
  if (destinationType === "feedback") return { label: "feedback", highlightTarget: "feedback form" };
  if (destinationType === "website") return { label: "website", highlightTarget: "website link" };
  if (destinationType === "hosted_multilink") return { label: "hosted multi-link page", highlightTarget: "hosted Tap Rater page" };
  return undefined;
}

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}
