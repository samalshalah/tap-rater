export type UseCase = {
  slug: string;
  name: string;
  description: string;
};

// Which business types a product is recommended for (Shop by Use). Products
// reference these by slug in their useCaseSlugs array -- a product can
// belong to many use cases without ever being duplicated as a separate SKU.
export const useCases: UseCase[] = [
  {
    slug: "restaurants-cafes",
    name: "Restaurants & Cafés",
    description: "Collect reviews, share your menu, and make it easy for diners to follow you or leave feedback."
  },
  {
    slug: "auto-dealer-repair",
    name: "Auto Dealer & Repair",
    description: "Guide shoppers, book service appointments, and improve the dealership and repair shop experience."
  },
  {
    slug: "front-desk-reception",
    name: "Front Desk & Reception",
    description: "Capture reviews and feedback right where customers check in."
  },
  {
    slug: "retail-grocery",
    name: "Retail & Grocery",
    description: "Turn checkout-counter moments into reviews, follows, and repeat visits."
  },
  {
    slug: "hotels-hospitality",
    name: "Hotels & Hospitality",
    description: "Make it effortless for guests to leave a review or reach the front desk."
  },
  {
    slug: "healthcare-dental",
    name: "Healthcare & Dental",
    description: "Collect patient reviews and make booking the next visit simple."
  },
  {
    slug: "salons-spas-wellness",
    name: "Salons, Spas & Wellness",
    description: "Capture reviews and bookings right at the chair or front desk."
  },
  {
    slug: "home-services",
    name: "Home Services",
    description: "Give technicians and crews an easy way to request a review on-site."
  },
  {
    slug: "events-popups",
    name: "Events & Pop-Ups",
    description: "A portable way to collect follows, reviews, or link visitors to more information."
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    description: "Share listings, request reviews, and make it easy for prospects to reach you."
  }
];

export function getUseCaseBySlug(slug: string): UseCase | undefined {
  return useCases.find((useCase) => useCase.slug === slug);
}
