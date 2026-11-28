import { brandedStandCatalogHref } from "./category-routes";

export const retiredProductRedirects = {
  "book-your-next-visit-stand": "/product/connect-with-us-stand",
  "book-appointment-stand": "/product/connect-with-us-stand",
  "view-our-menu-stand": "/product/menu-and-order-stand",
  "view-menu-stand": "/product/menu-and-order-stand",
  "custom-direct-stand": brandedStandCatalogHref,
  "tap-rater-business-white-bundle": "/stand-bundles",
  "tap-rater-business-white-stands-bundle": "/stand-bundles",
  // CareDash shut down, so its review stand is off sale (Nov 2026).
  "caredash-review-stand": "/business/healthcare-dental",
  // Catalog cleanup (Nov 2026): same review site as another stand, or a site that only takes in-app reviews.
  "homeadvisor-review-stand": "/product/angi-review-stand", // HomeAdvisor is now part of Angi
  "trulia-review-stand": "/product/zillow-review-stand", // Trulia agent reviews are Zillow reviews
  "lawyers-review-stand": "/product/martindale-review-stand", // Lawyers.com shares Martindale reviews
  "linkedin-connect-stand": "/product/linkedin-follow-stand", // same LinkedIn page as the Follow stand
  "taskrabbit-review-stand": "/business/home-services" // Taskrabbit reviews come only from tasks booked in its app
};
