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
  const destination = getReviewDestination(product);
  const format = product.format;

  return [
    {
      title: "Tap or scan ready",
      body: `Customers tap or scan and open your ${destination} destination without searching.`
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
      bestFor: "Business name, QR code, and manual logo collection",
      fit: "Final proof required before printing",
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
  const title = product.title.toLowerCase();

  if (title.includes("facebook")) {
    return "Facebook review";
  }

  if (title.includes("yelp")) {
    return "Yelp review";
  }

  if (title.includes("tripadvisor")) {
    return "TripAdvisor review";
  }

  if (title.includes("experience")) {
    return "feedback";
  }

  if (title.includes("social")) {
    return "social media";
  }

  if (title.includes("book")) {
    return "booking";
  }

  if (title.includes("menu")) {
    return "menu";
  }

  return "Google review";
}
