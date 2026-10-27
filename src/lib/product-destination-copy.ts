import type { MigratedProduct } from "@/data/migrated-products";

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

const platformDestinationCopy = new Map<string, ProductDestinationCopy>([
  ["google", { label: "Google review", highlightTarget: "Google review destination", linkType: "Google review link" }],
  ["yelp", { label: "Yelp review", highlightTarget: "Yelp review destination", linkType: "Yelp review link" }],
  ["facebook", { label: "Facebook review", highlightTarget: "Facebook review destination", linkType: "Facebook review link" }],
  ["tripadvisor", { label: "TripAdvisor review", highlightTarget: "TripAdvisor review destination", linkType: "TripAdvisor review link" }],
  ["ubereats", { label: "Uber Eats review", highlightTarget: "Uber Eats review destination", linkType: "Uber Eats review link" }],
  ["angi", { label: "Angi review", highlightTarget: "Angi review destination", linkType: "Angi review link" }],
  ["dealerrater", { label: "DealerRater review", highlightTarget: "DealerRater review destination", linkType: "DealerRater review link" }],
  ["autotrader", { label: "Autotrader review", highlightTarget: "Autotrader review destination", linkType: "Autotrader review link" }],
  ["carfax", { label: "CARFAX review", highlightTarget: "CARFAX review destination", linkType: "CARFAX review link" }],
  ["edmunds", { label: "Edmunds review", highlightTarget: "Edmunds review destination", linkType: "Edmunds review link" }],
  ["cars", { label: "Cars.com review", highlightTarget: "Cars.com review destination", linkType: "Cars.com review link" }],
  ["cargurus", { label: "CarGurus review", highlightTarget: "CarGurus review destination", linkType: "CarGurus review link" }],
  ["repairpal", { label: "RepairPal review", highlightTarget: "RepairPal review destination", linkType: "RepairPal review link" }],
  ["surecritic", { label: "SureCritic review", highlightTarget: "SureCritic review destination", linkType: "SureCritic review link" }],
  ["bbb", { label: "BBB review", highlightTarget: "Better Business Bureau review destination", linkType: "BBB review link" }],
  ["nextdoor", { label: "Nextdoor review", highlightTarget: "Nextdoor review destination", linkType: "Nextdoor review link" }],
  ["avvo", { label: "Avvo review", highlightTarget: "Avvo review destination", linkType: "Avvo review link" }],
  ["taskrabbit", { label: "Taskrabbit review", highlightTarget: "Taskrabbit review destination", linkType: "Taskrabbit review link" }],
  ["martindale", { label: "Martindale review", highlightTarget: "Martindale review destination", linkType: "Martindale review link" }],
  ["justia", { label: "Justia review", highlightTarget: "Justia review destination", linkType: "Justia review link" }],
  ["findlaw", { label: "FindLaw review", highlightTarget: "FindLaw review destination", linkType: "FindLaw review link" }],
  ["lawyers", { label: "Lawyers.com review", highlightTarget: "Lawyers.com review destination", linkType: "Lawyers.com review link" }],
  ["zillow", { label: "Zillow review", highlightTarget: "Zillow review destination", linkType: "Zillow review link" }],
  ["realtor", { label: "Realtor.com review", highlightTarget: "Realtor.com review destination", linkType: "Realtor.com review link" }],
  ["homes", { label: "Homes.com review", highlightTarget: "Homes.com review destination", linkType: "Homes.com review link" }],
  ["apartments", { label: "Apartments.com review", highlightTarget: "Apartments.com review destination", linkType: "Apartments.com review link" }],
  ["trulia", { label: "Trulia review", highlightTarget: "Trulia review destination", linkType: "Trulia review link" }],
  ["homeadvisor", { label: "HomeAdvisor review", highlightTarget: "HomeAdvisor review destination", linkType: "HomeAdvisor review link" }],
  ["thumbtack", { label: "Thumbtack review", highlightTarget: "Thumbtack review destination", linkType: "Thumbtack review link" }],
  ["houzz", { label: "Houzz review", highlightTarget: "Houzz review destination", linkType: "Houzz review link" }],
  ["porch", { label: "Porch review", highlightTarget: "Porch review destination", linkType: "Porch review link" }],
  ["airbnb", { label: "Airbnb review", highlightTarget: "Airbnb review destination", linkType: "Airbnb review link" }],
  ["agoda", { label: "Agoda review", highlightTarget: "Agoda review destination", linkType: "Agoda review link" }],
  ["vrbo", { label: "Vrbo review", highlightTarget: "Vrbo review destination", linkType: "Vrbo review link" }],
  ["hotels", { label: "Hotels.com review", highlightTarget: "Hotels.com review destination", linkType: "Hotels.com review link" }],
  ["healthgrades", { label: "Healthgrades review", highlightTarget: "Healthgrades review destination", linkType: "Healthgrades review link" }],
  ["vitals", { label: "Vitals review", highlightTarget: "Vitals review destination", linkType: "Vitals review link" }],
  ["zocdoc", { label: "Zocdoc review", highlightTarget: "Zocdoc review destination", linkType: "Zocdoc review link" }],
  ["ratemds", { label: "RateMDs review", highlightTarget: "RateMDs review destination", linkType: "RateMDs review link" }],
  ["caredash", { label: "CareDash review", highlightTarget: "CareDash review destination", linkType: "CareDash review link" }],
  ["opencare", { label: "Opencare review", highlightTarget: "Opencare review destination", linkType: "Opencare review link" }],
  ["fresha", { label: "Fresha review", highlightTarget: "Fresha review destination", linkType: "Fresha review link" }],
  ["booksy", { label: "Booksy review", highlightTarget: "Booksy review destination", linkType: "Booksy review link" }],
  ["styleseat", { label: "StyleSeat review", highlightTarget: "StyleSeat review destination", linkType: "StyleSeat review link" }],
  ["vagaro", { label: "Vagaro review", highlightTarget: "Vagaro review destination", linkType: "Vagaro review link" }],
  ["instagram", { label: "Instagram", highlightTarget: "Instagram profile", linkType: "Instagram profile URL" }],
  ["tiktok", { label: "TikTok", highlightTarget: "TikTok profile", linkType: "TikTok profile URL" }],
  ["linkedin", { label: "LinkedIn", highlightTarget: "LinkedIn page", linkType: "LinkedIn page URL" }],
  ["x", { label: "X", highlightTarget: "X profile", linkType: "X profile URL" }],
  ["youtube", { label: "YouTube", highlightTarget: "YouTube channel", linkType: "YouTube channel URL" }],
  ["snapchat", { label: "Snapchat", highlightTarget: "Snapchat profile", linkType: "Snapchat profile URL" }],
  ["pinterest", { label: "Pinterest", highlightTarget: "Pinterest profile", linkType: "Pinterest profile URL" }],
  ["whatsapp", { label: "WhatsApp", highlightTarget: "WhatsApp message destination", linkType: "WhatsApp URL" }],
  ["telegram", { label: "Telegram", highlightTarget: "Telegram message destination", linkType: "Telegram URL" }],
  ["website", { label: "website", highlightTarget: "website link", linkType: "website URL" }],
  ["custom-menu-url", { label: "menu", highlightTarget: "menu URL", linkType: "menu URL" }],
  ["custom-booking-url", { label: "booking", highlightTarget: "booking URL", linkType: "booking URL" }],
]);

function getPlatformDestinationCopy(platform: string, destinationType = ""): ProductDestinationCopy | undefined {
  if (platform === "facebook" && destinationType === "social") return { label: "Facebook", highlightTarget: "Facebook page", linkType: "Facebook page URL" };
  const copy = platformDestinationCopy.get(platform);
  // Preserve a fresh result so callers cannot mutate future destination copy.
  return copy ? { ...copy } : undefined;
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
