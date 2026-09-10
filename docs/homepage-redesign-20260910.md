# Homepage conversion layout - local draft

Preview: http://127.0.0.1:3031/

No deployment, commit, Stripe change, production content write, or order/customer modification was made for this draft.

## Card-style restoration

The owner's approved hero and section order are unchanged. Category and business-use entries now reuse the original HomepageBrowseCard/VisualCard components, including compact mobile rows. Featured stands keep the unchanged ProductCard component. Removed homepage-only shadow/border overrides and excluded shared cards from homepage typography resets so their margins, fonts, and hover states remain intact. No shared card component was edited.

The owner subsequently requested five cards in every homepage card row. Category, featured-product, and business-use grids now have five desktop columns. Featured inventory adds Rate Your Experience; business uses add Hotel / Travel and Healthcare / Dental. The editor and validation accept all five entries. Compact category and business cards retain the 4:5 ratio with local spacing/type sizing, while product cards retain the shop styling. Mobile layouts and the hero are unchanged.

Business-use cards now read the existing category banner/image from getPublicBusinessUses instead of defaulting to isolated stand renders. Explicit homepage scene overrides still take precedence. Product images are only a fallback when neither scene nor business-use media exists, and product-example captions are not attached to category photos.

## Owner-Supplied Scene Replacements

Replaced the six shared use-case images for Restaurant / Food, Healthcare / Dental, Legal, Hotel / Travel, Beauty / Salon / Wellness, and Automotive with the owner's supplied PNGs. Original Downloads files are untouched. Shared WebP sources preserve the supplied pixels losslessly; the existing image pipeline rebuilt their 160/640/1200 WebP variants. Existing category references now display these replacements on the homepage and solution pages without a database write. Restaurant and hotel crop positions keep their right-hand stands visible. The cafe homepage hero is unchanged. Import mappings and verification receipts are in artifacts/homepage-redesign-20260910/.

## Implemented

1. Product hero: owner-selected cafe illustration, Tap Rater product headline, live starting price, Shop Stands and Customize Yours.
2. Five customer actions with inventory images. Booking and feedback use relevant active product destinations instead of empty category collections.
3. Five featured stands: Google Review, Follow Us on Social Media, Menu and Order, Connect With Us, Rate Your Experience. No bestseller claim.
4. Matching-angle Google Standard and Branded template comparison with prices from purchase options and Branded checkout intent preserved.
5. Correct NFC sequence. Real video renders only after a video URL is provided; native controls, inline playback, no autoplay, optional captions and transcript.
6. Optional Multi-Link offer, current monthly service price, link limit, physical stand cost distinction, and subscription-free Direct alternative.
7. Five business contexts linked to existing solution pages and using their current category images. These are use-case visuals, not customer testimonials or verified installation proof.
8. Product details sourced from the comparison product, without invented reviews or customer counts.
9. FAQs covering Direct subscriptions, customization, compatibility, shipping, and setup; final shopping and bulk-contact actions.

The site editor at /admin/content/homepage supports featured slugs, comparison media, scene photos, video/poster/captions/transcript, quality media, and visibility. A new homepage.showcase content record stores these settings. Existing API clients may omit it. Once it has been saved, the initial layout migration no longer replaces legacy-looking merchant choices.

## Media still needed

- Actual roughly 10-second phone/NFC demonstration. No fabricated demo is shown.
- Finished Standard and Branded photos of the same product at the same angle and size. Current comparison explicitly labels the Branded template.
- Actual salon and automotive installation photos featuring appropriate stands.
- Acrylic, base, and print close-ups. Current details image is a labeled product design.
- Verified customer photos/testimonials, only if available and approved. No placeholder testimonial block is published.

The supplied cafe file is an AI-edited image produced in this task, not proof of a customer installation. It is labeled accordingly.

## Verification

- Six Chromium viewport checks: 320, 390, 768, 1024, 1440, and 1920 pixels.
- All nine sections, five featured product links, image loads, FAQ expansion, and internal destinations checked.
- Scoped active-app TypeScript check excludes archived source copies and passes. The broad repository tsconfig also includes historical artifacts and reports unrelated duplicate/runtime type errors; it was not altered.
- Unit test and browser receipts live in artifacts/homepage-redesign-20260910/.
- Development React reports a debugging-only eval/CSP warning. Production CSP was not relaxed to suppress it.
- This pass is a local layout/content preview, not a production build or deployment acceptance.
