import type {MigratedProduct} from '@/data/migrated-products';

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function readStockStatus(value: unknown): MigratedProduct["stockStatus"] | undefined {
  return value === "instock" || value === "outofstock" ? value : undefined;
}

export function readServiceMode(value: unknown): MigratedProduct["serviceMode"] | undefined {
  if (value === "premium_landing_page") {
    return "hosted_landing_page";
  }

  return value === "basic_redirect" || value === "managed_redirect" || value === "hosted_landing_page" || value === "multi_location_platform"
    ? value
    : undefined;
}

export function readProductType(value: unknown): MigratedProduct["productType"] | undefined {
  return value === "physical_redirect" || value === "physical_managed" || value === "platform_landing_page" || value === "bundle"
    ? value
    : undefined;
}

export function readCheckoutMode(value: unknown): MigratedProduct["checkoutMode"] | undefined {
  return value === "buy_now" || value === "request_quote" || value === "subscription" || value === "contact_sales" ? value : undefined;
}

export function readSupportedDestinations(value: unknown): MigratedProduct["supportedDestinations"] | undefined {
  const destinations: MigratedProduct["supportedDestinations"][number][] = [
    "google",
    "facebook",
    "yelp",
    "tripadvisor",
    "trustpilot",
    "bbb",
    "nextdoor",
    "avvo",
    "taskrabbit",
    "martindale",
    "justia",
    "findlaw",
    "lawyers",
    "zillow",
    "realtor",
    "homes",
    "apartments",
    "trulia",
    "dealerrater",
    "autotrader",
    "carfax",
    "edmunds",
    "cars",
    "cargurus",
    "repairpal",
    "surecritic",
    "homeadvisor",
    "thumbtack",
    "houzz",
    "porch",
    "instagram",
    "tiktok",
    "linkedin",
    "x",
    "youtube",
    "snapchat",
    "pinterest",
    "whatsapp",
    "telegram",
    "airbnb",
    "agoda",
    "vrbo",
    "hotels",
    "healthgrades",
    "vitals",
    "ratemds",
    "caredash",
    "opencare",
    "styleseat",
    "vagaro",
    "booksy",
    "fresha",
    "zocdoc",
    "calendly",
    "acuity",
    "square-appointments",
    "custom-booking-url",
    "booking",
    "toast",
    "doordash",
    "ubereats",
    "angi",
    "grubhub",
    "opentable",
    "resy",
    "custom-menu-url",
    "website",
    "menu",
    "wifi",
    "feedback",
    "referral",
    "payment-url",
    "loyalty-url",
    "custom-url",
    "custom"
  ];

  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value.filter((item): item is MigratedProduct["supportedDestinations"][number] => {
    return destinations.includes(item as MigratedProduct["supportedDestinations"][number]);
  });
  return normalized.length > 0 ? normalized : undefined;
}

export function readActivationType(value: unknown): MigratedProduct["activationType"] | undefined {
  return value === "free_basic_activation" || value === "managed_setup" || value === "premium_hosted_activation" ? value : undefined;
}

export function readProductFormat(value: unknown): MigratedProduct["format"] | undefined {
  return value === "stand" || value === "plate" || value === "bundle" || value === "platform" ? value : undefined;
}

export function readProductKind(value: unknown): MigratedProduct["productKind"] | undefined {
  return value === "normal_direct" || value === "custom_direct" || value === "hosted_multilink" || value === "bundle" ? value : undefined;
}

export function categorySlugForStandType(standTypeSlug: string | undefined): MigratedProduct["categorySlug"] | undefined {
  const map: Record<string, MigratedProduct["categorySlug"]> = {
    "review-stands": "reviews",
    "social-media-stands": "social-media",
    "appointment-reservation-stands": "appointments",
    "menu-info-stands": "menu",
    "feedback-survey-stands": "feedback",
    "website-link-stands": "website-links",
    "payment-tip-donation-stands": "website-links",
    "loyalty-rewards-stands": "website-links",
    "custom-stands": "custom-stands"
  };

  return standTypeSlug ? map[standTypeSlug] : undefined;
}

export function readProductStatus(value: unknown): MigratedProduct["status"] | undefined {
  return value === "draft" || value === "active" || value === "archived" ? value : undefined;
}

export function readAssetReadinessStatus(value: unknown): MigratedProduct["assetReadinessStatus"] | undefined {
  return value === "draft_missing_assets" || value === "ready" || value === "blocked" ? value : undefined;
}

export function readCustomizationOptions(value: unknown): MigratedProduct["customizationOptions"] | undefined {
  const options: MigratedProduct["customizationOptions"][number][] = ["standard_design", "add_logo", "custom_design"];

  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value.filter((item): item is MigratedProduct["customizationOptions"][number] => {
    return options.includes(item as MigratedProduct["customizationOptions"][number]);
  });
  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

export function readDesignMode(value: unknown): MigratedProduct["designMode"] | undefined {
  return value === "standard" || value === "logo" || value === "custom" ? value : undefined;
}

export function inferProductFormatFromTitle(title: string | undefined): MigratedProduct["format"] | undefined {
  if (!title) {
    return undefined;
  }

  const normalized = title.toLowerCase();
  if (normalized.includes("plate")) return "plate";
  if (normalized.includes("bundle") || normalized.includes("kit")) return "bundle";
  if (normalized.includes("page") || normalized.includes("dashboard")) return "platform";
  return "stand";
}

export function readStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

export function readArray<T = unknown>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

export function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

export function readImages(value: unknown): MigratedProduct["images"] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const images = value.filter((item): item is { src: string; alt: string } => {
    return Boolean(
      item &&
        typeof item === "object" &&
        typeof (item as { src?: unknown }).src === "string" &&
        typeof (item as { alt?: unknown }).alt === "string"
    );
  });

  return images;
}

export function readVariants(value: unknown): MigratedProduct["variants"] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const variants = value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const variant = item as { id?: unknown; label?: unknown; sku?: unknown; stockStatus?: unknown; stock_status?: unknown };
    const id = readString(variant.id);
    const label = readString(variant.label);
    const sku = readString(variant.sku);
    const stockStatus = readStockStatus(variant.stockStatus ?? variant.stock_status);

    return id && label && sku && stockStatus ? [{ id, label, sku, stockStatus }] : [];
  });

  return variants.length > 0 ? variants : undefined;
}
