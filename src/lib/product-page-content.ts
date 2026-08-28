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
  const destination = getProductDestinationCopy(product);

  return [
    {
      title: "Tap or scan ready",
      body: `Customers tap and open your ${destination.highlightTarget} without searching.`
    },
    {
      title: "Connects to one destination URL",
      body: `Use the ${destination.linkType} you approve for this stand. Standard Direct points the NFC tap to that same destination.`
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
      body: "Offer the tap prompt after a completed appointment while the visit is still fresh."
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
      bestFor: "Business name, uploaded logo, and QR code",
      fit: "Front proof preview before cart",
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

type ProductDestinationCopy = {
  label: string;
  highlightTarget: string;
  linkType: string;
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
      highlightTarget: "hosted Tap Rater page",
      linkType: "hosted landing page"
    };
  }

  const platformCopy = getPlatformDestinationCopy(platform, destinationType);
  if (platformCopy) {
    return platformCopy;
  }

  const destinationCopy = getDestinationTypeCopy(destinationType);
  if (destinationCopy) {
    return destinationCopy;
  }

  if (standType.includes("review") || category === "reviews") {
    return { label: "review", highlightTarget: "review link", linkType: "review link" };
  }

  if (standType.includes("menu") || category === "menu" || title.includes("menu")) {
    return { label: "menu", highlightTarget: "menu URL", linkType: "menu URL" };
  }

  if (standType.includes("appointment") || category === "appointments" || title.includes("book")) {
    return { label: "booking", highlightTarget: "booking URL", linkType: "booking URL" };
  }

  if (standType.includes("social") || category === "social-media" || title.includes("follow") || title.includes("social")) {
    return { label: "social media", highlightTarget: "social profile", linkType: "social profile URL" };
  }

  if (standType.includes("feedback") || category === "feedback" || title.includes("experience")) {
    return { label: "feedback", highlightTarget: "feedback form", linkType: "feedback form URL" };
  }

  if (standType.includes("website") || category === "website-links" || title.includes("website")) {
    return { label: "website", highlightTarget: "website link", linkType: "website URL" };
  }

  return { label: "direct link", highlightTarget: "destination link", linkType: "destination URL" };
}

function getPlatformDestinationCopy(platform: string, destinationType = ""): ProductDestinationCopy | undefined {
  if (platform === "google") return { label: "Google review", highlightTarget: "Google review destination", linkType: "Google review link" };
  if (platform === "yelp") return { label: "Yelp review", highlightTarget: "Yelp review destination", linkType: "Yelp review link" };
  if (platform === "facebook" && destinationType === "social") return { label: "Facebook", highlightTarget: "Facebook page", linkType: "Facebook page URL" };
  if (platform === "facebook") return { label: "Facebook review", highlightTarget: "Facebook review destination", linkType: "Facebook review link" };
  if (platform === "tripadvisor") return { label: "TripAdvisor review", highlightTarget: "TripAdvisor review destination", linkType: "TripAdvisor review link" };
  if (platform === "ubereats") return { label: "Uber Eats review", highlightTarget: "Uber Eats review destination", linkType: "Uber Eats review link" };
  if (platform === "angi") return { label: "Angi review", highlightTarget: "Angi review destination", linkType: "Angi review link" };
  if (platform === "dealerrater") return { label: "DealerRater review", highlightTarget: "DealerRater review destination", linkType: "DealerRater review link" };
  if (platform === "autotrader") return { label: "Autotrader review", highlightTarget: "Autotrader review destination", linkType: "Autotrader review link" };
  if (platform === "carfax") return { label: "CARFAX review", highlightTarget: "CARFAX review destination", linkType: "CARFAX review link" };
  if (platform === "edmunds") return { label: "Edmunds review", highlightTarget: "Edmunds review destination", linkType: "Edmunds review link" };
  if (platform === "cars") return { label: "Cars.com review", highlightTarget: "Cars.com review destination", linkType: "Cars.com review link" };
  if (platform === "cargurus") return { label: "CarGurus review", highlightTarget: "CarGurus review destination", linkType: "CarGurus review link" };
  if (platform === "repairpal") return { label: "RepairPal review", highlightTarget: "RepairPal review destination", linkType: "RepairPal review link" };
  if (platform === "surecritic") return { label: "SureCritic review", highlightTarget: "SureCritic review destination", linkType: "SureCritic review link" };
  if (platform === "bbb") return { label: "BBB review", highlightTarget: "Better Business Bureau review destination", linkType: "BBB review link" };
  if (platform === "nextdoor") return { label: "Nextdoor review", highlightTarget: "Nextdoor review destination", linkType: "Nextdoor review link" };
  if (platform === "avvo") return { label: "Avvo review", highlightTarget: "Avvo review destination", linkType: "Avvo review link" };
  if (platform === "taskrabbit") return { label: "Taskrabbit review", highlightTarget: "Taskrabbit review destination", linkType: "Taskrabbit review link" };
  if (platform === "martindale") return { label: "Martindale review", highlightTarget: "Martindale review destination", linkType: "Martindale review link" };
  if (platform === "justia") return { label: "Justia review", highlightTarget: "Justia review destination", linkType: "Justia review link" };
  if (platform === "findlaw") return { label: "FindLaw review", highlightTarget: "FindLaw review destination", linkType: "FindLaw review link" };
  if (platform === "lawyers") return { label: "Lawyers.com review", highlightTarget: "Lawyers.com review destination", linkType: "Lawyers.com review link" };
  if (platform === "zillow") return { label: "Zillow review", highlightTarget: "Zillow review destination", linkType: "Zillow review link" };
  if (platform === "realtor") return { label: "Realtor.com review", highlightTarget: "Realtor.com review destination", linkType: "Realtor.com review link" };
  if (platform === "homes") return { label: "Homes.com review", highlightTarget: "Homes.com review destination", linkType: "Homes.com review link" };
  if (platform === "apartments") return { label: "Apartments.com review", highlightTarget: "Apartments.com review destination", linkType: "Apartments.com review link" };
  if (platform === "trulia") return { label: "Trulia review", highlightTarget: "Trulia review destination", linkType: "Trulia review link" };
  if (platform === "homeadvisor") return { label: "HomeAdvisor review", highlightTarget: "HomeAdvisor review destination", linkType: "HomeAdvisor review link" };
  if (platform === "thumbtack") return { label: "Thumbtack review", highlightTarget: "Thumbtack review destination", linkType: "Thumbtack review link" };
  if (platform === "houzz") return { label: "Houzz review", highlightTarget: "Houzz review destination", linkType: "Houzz review link" };
  if (platform === "porch") return { label: "Porch review", highlightTarget: "Porch review destination", linkType: "Porch review link" };
  if (platform === "airbnb") return { label: "Airbnb review", highlightTarget: "Airbnb review destination", linkType: "Airbnb review link" };
  if (platform === "agoda") return { label: "Agoda review", highlightTarget: "Agoda review destination", linkType: "Agoda review link" };
  if (platform === "vrbo") return { label: "Vrbo review", highlightTarget: "Vrbo review destination", linkType: "Vrbo review link" };
  if (platform === "hotels") return { label: "Hotels.com review", highlightTarget: "Hotels.com review destination", linkType: "Hotels.com review link" };
  if (platform === "healthgrades") return { label: "Healthgrades review", highlightTarget: "Healthgrades review destination", linkType: "Healthgrades review link" };
  if (platform === "vitals") return { label: "Vitals review", highlightTarget: "Vitals review destination", linkType: "Vitals review link" };
  if (platform === "zocdoc") return { label: "Zocdoc review", highlightTarget: "Zocdoc review destination", linkType: "Zocdoc review link" };
  if (platform === "ratemds") return { label: "RateMDs review", highlightTarget: "RateMDs review destination", linkType: "RateMDs review link" };
  if (platform === "caredash") return { label: "CareDash review", highlightTarget: "CareDash review destination", linkType: "CareDash review link" };
  if (platform === "opencare") return { label: "Opencare review", highlightTarget: "Opencare review destination", linkType: "Opencare review link" };
  if (platform === "fresha") return { label: "Fresha review", highlightTarget: "Fresha review destination", linkType: "Fresha review link" };
  if (platform === "booksy") return { label: "Booksy review", highlightTarget: "Booksy review destination", linkType: "Booksy review link" };
  if (platform === "styleseat") return { label: "StyleSeat review", highlightTarget: "StyleSeat review destination", linkType: "StyleSeat review link" };
  if (platform === "vagaro") return { label: "Vagaro review", highlightTarget: "Vagaro review destination", linkType: "Vagaro review link" };
  if (platform === "instagram") return { label: "Instagram", highlightTarget: "Instagram profile", linkType: "Instagram profile URL" };
  if (platform === "tiktok") return { label: "TikTok", highlightTarget: "TikTok profile", linkType: "TikTok profile URL" };
  if (platform === "linkedin") return { label: "LinkedIn", highlightTarget: "LinkedIn page", linkType: "LinkedIn page URL" };
  if (platform === "x") return { label: "X", highlightTarget: "X profile", linkType: "X profile URL" };
  if (platform === "youtube") return { label: "YouTube", highlightTarget: "YouTube channel", linkType: "YouTube channel URL" };
  if (platform === "snapchat") return { label: "Snapchat", highlightTarget: "Snapchat profile", linkType: "Snapchat profile URL" };
  if (platform === "pinterest") return { label: "Pinterest", highlightTarget: "Pinterest profile", linkType: "Pinterest profile URL" };
  if (platform === "whatsapp") return { label: "WhatsApp", highlightTarget: "WhatsApp message destination", linkType: "WhatsApp URL" };
  if (platform === "telegram") return { label: "Telegram", highlightTarget: "Telegram message destination", linkType: "Telegram URL" };
  if (platform === "website") return { label: "website", highlightTarget: "website link", linkType: "website URL" };
  if (platform === "custom-menu-url") return { label: "menu", highlightTarget: "menu URL", linkType: "menu URL" };
  if (platform === "custom-booking-url") return { label: "booking", highlightTarget: "booking URL", linkType: "booking URL" };
  if (platform === "custom-url") return undefined;
  return undefined;
}

function getDestinationTypeCopy(destinationType: string): ProductDestinationCopy | undefined {
  if (destinationType === "review" || destinationType === "review_social") {
    return { label: "review", highlightTarget: "review link", linkType: "review link" };
  }

  if (destinationType === "menu") return { label: "menu", highlightTarget: "menu URL", linkType: "menu URL" };
  if (destinationType === "booking" || destinationType === "reservation") return { label: "booking", highlightTarget: "booking URL", linkType: "booking URL" };
  if (destinationType === "social") return { label: "social media", highlightTarget: "social profile", linkType: "social profile URL" };
  if (destinationType === "feedback") return { label: "feedback", highlightTarget: "feedback form", linkType: "feedback form URL" };
  if (destinationType === "website") return { label: "website", highlightTarget: "website link", linkType: "website URL" };
  if (destinationType === "hosted_multilink") return { label: "hosted multi-link page", highlightTarget: "hosted Tap Rater page", linkType: "hosted landing page" };
  return undefined;
}

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}
