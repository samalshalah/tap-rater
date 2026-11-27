import { z } from "zod";

export const reviewProductSlug = "google-review-stand";
export const reviewProductName = "Custom Google Review Stand";
export const invitationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
});
export const reviewSubmissionSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  displayName: z.string().trim().min(1).max(100),
  businessName: z.string().trim().max(120).default(""),
  body: z.string().trim().min(10).max(2000),
  publishPermission: z.boolean(),
  photoPermission: z.boolean(),
});
export const invitationSubject = "How is your Tap Rater stand working?";
export function invitationCopy(name: string, expiresAt?: string) {
  return [
    `Hi ${name},`,
    "Thank you for choosing Tap Rater. How has your custom Google review stand been working in your business?",
    "Would you share an honest rating and a few words about the print, setup, and everyday use? Positive and critical feedback are equally welcome.",
    "You can also take or upload a photo of the stand in your shop. A photo is completely optional, and no account is needed.",
    "You choose whether we may publish your review and photo on taprater.com. Your email stays private. There is no reward for leaving a review.",
    `${expiresAt ? `This personal link expires on ${new Date(expiresAt).toISOString().slice(0, 10)}.` : "The personal link below is valid for 90 days."} If you need help instead, just reply to this email.`,
  ];
}
export type PublicProductReview = {
  id: string; display_name: string; business_name: string | null;
  rating: number; review_body: string; submitted_at: string; has_photo: boolean;
};
export type PublicProductReviews = { reviews: PublicProductReview[]; count: number; average: number | null };
export const emptyProductReviews: PublicProductReviews = { reviews: [], count: 0, average: null };

export function productReviewJsonLd(data?: PublicProductReviews) {
  if (!data?.count || !data.average || !data.reviews.length) return {};
  return {
    aggregateRating: { "@type": "AggregateRating", ratingValue: data.average, reviewCount: data.count, bestRating: 5, worstRating: 1 },
    review: data.reviews.map(review => ({
      "@type": "Review", author: { "@type": "Person", name: review.display_name },
      datePublished: new Date(review.submitted_at).toISOString().slice(0, 10),
      reviewBody: review.review_body,
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    })),
  };
}
