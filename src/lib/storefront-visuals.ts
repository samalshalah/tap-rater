import type { CatalogCategory, CatalogCategorySlug, MigratedProduct } from "@/data/migrated-products";

export type StorefrontVisual = {
  src: string;
  alt: string;
};

export type BusinessUseCase = {
  title: string;
  description: string;
  href: string;
  image: StorefrontVisual;
};

export type CustomerActionCard = {
  title: string;
  description: string;
  href: string;
  image: StorefrontVisual;
};

export const productImageFallback: StorefrontVisual = {
  src: "/uploads/products/no-photo-available.png",
  alt: "Product image coming soon"
};

const categoryVisuals: Record<CatalogCategorySlug, StorefrontVisual> = {
  reviews: {
    src: "/uploads/products/google-review-stand.png",
    alt: "Google Review Stand"
  },
  "social-media": {
    src: "/uploads/products/social-media-stand.png",
    alt: "Social Media Stand"
  },
  appointments: {
    src: "/uploads/products/book-next-visit-stand.png",
    alt: "Book Your Next Visit Stand"
  },
  menu: {
    src: "/uploads/products/view-menu-stand.png",
    alt: "View Menu Stand"
  },
  feedback: {
    src: "/uploads/products/rate-your-experience-stand.png",
    alt: "Rate Your Experience Stand"
  },
  "website-links": {
    src: "/uploads/products/no-photo-available.png",
    alt: "Website and Link Stand"
  },
  "custom-stands": {
    src: "/uploads/products/business-google-white-stands-bundle.jpg",
    alt: "Custom Tap Rater Stands"
  }
};

export const businessUseCases: BusinessUseCase[] = [
  {
    title: "Restaurants & Cafes",
    description: "Reviews, menus, reservations, ordering, and feedback.",
    href: "/category/menu",
    image: { src: "/uploads/use-cases/restaurants-cafes.webp", alt: "Restaurant table with menu stand" }
  },
  {
    title: "Auto Dealerships",
    description: "Reviews, inventory, service, quotes, and contact actions.",
    href: "/category/reviews",
    image: { src: "/uploads/use-cases/auto-dealerships.webp", alt: "Auto service counter with customer" }
  },
  {
    title: "Healthcare & Dental",
    description: "Reviews, appointments, patient feedback, and directions.",
    href: "/category/appointments",
    image: { src: "/uploads/use-cases/healthcare-dental.webp", alt: "Dental office reception" }
  },
  {
    title: "Beauty & Wellness",
    description: "Bookings, reviews, services, social links, and offers.",
    href: "/category/appointments",
    image: { src: "/uploads/use-cases/beauty-wellness.webp", alt: "Spa and wellness reception" }
  },
  {
    title: "Hotels & Hospitality",
    description: "Travel reviews, guest info, local links, and feedback.",
    href: "/category/reviews",
    image: { src: "/uploads/use-cases/hotels-hospitality.webp", alt: "Hotel reception desk" }
  },
  {
    title: "Retail & Grocery",
    description: "Reviews, social follows, offers, websites, and apps.",
    href: "/category/social-media",
    image: { src: "/uploads/use-cases/retail-grocery.webp", alt: "Retail packaging station" }
  },
  {
    title: "Home Services",
    description: "Reviews, quotes, appointment links, and service requests.",
    href: "/category/reviews",
    image: { src: "/uploads/use-cases/home-services.webp", alt: "Home service contractor with homeowner" }
  },
  {
    title: "Real Estate",
    description: "Reviews, listings, contact actions, galleries, and tours.",
    href: "/category/website-links",
    image: { src: "/uploads/use-cases/real-estate.webp", alt: "Real estate open house table" }
  },
  {
    title: "Events & Pop-Ups",
    description: "Schedules, tickets, social links, maps, and vendor info.",
    href: "/category/website-links",
    image: { src: "/uploads/use-cases/events-popups.webp", alt: "Event reception and networking" }
  }
];

export const customerActionCards: CustomerActionCard[] = [
  {
    title: "Get reviews",
    description: "Send customers to Google, Yelp, Tripadvisor, or another review page.",
    href: "/category/reviews",
    image: { src: "/uploads/products/google-review-stand.png", alt: "Google Review Stand" }
  },
  {
    title: "Book appointments",
    description: "Open booking, scheduling, reservation, or service links.",
    href: "/category/appointments",
    image: { src: "/uploads/products/book-next-visit-stand.png", alt: "Book appointment stand" }
  },
  {
    title: "View menu",
    description: "Put menus, specials, services, or info one tap away.",
    href: "/category/menu",
    image: { src: "/uploads/products/view-menu-stand.png", alt: "View Menu Stand" }
  },
  {
    title: "Follow social media",
    description: "Grow Instagram, Facebook, TikTok, LinkedIn, and social profiles.",
    href: "/category/social-media",
    image: { src: "/uploads/products/social-media-stand.png", alt: "Social Media Stand" }
  },
  {
    title: "Visit website",
    description: "Connect to your site, catalog, offer, app, location, or link page.",
    href: "/category/website-links",
    image: { src: "/uploads/products/no-photo-available.png", alt: "Website link stand" }
  },
  {
    title: "Custom stand",
    description: "Review custom stand options and request design help before checkout opens.",
    href: "/custom-stands",
    image: { src: "/uploads/products/business-google-white-stands-bundle.jpg", alt: "Custom Tap Rater Stands" }
  }
];

export function getCategoryVisual(category: Pick<CatalogCategory, "slug" | "title">): StorefrontVisual {
  return categoryVisuals[category.slug] ?? {
    ...productImageFallback,
    alt: `${category.title} image coming soon`
  };
}

export function getProductVisual(product: Pick<MigratedProduct, "slug" | "title" | "images">): StorefrontVisual {
  if (product.slug === "custom-direct-stand") {
    return {
      src: "/uploads/products/business-google-white-stands-bundle.jpg",
      alt: "Custom Tap Rater Stands"
    };
  }

  return product.images.find((item) => item.src) ?? { ...productImageFallback, alt: product.title };
}
