-- Owner-authorized SEO copy update for taprater.com on 2026-11-24.
-- Target: tap-rater / tap-rater-production-20261104 (br-damp-fire-atg7dt22).
-- Content only; no prices, images, purchase options, or schema changes.
DO $seo$
BEGIN
  UPDATE products
  SET title = 'Custom Google Review Stand with Your Logo',
      short_description = 'Your logo, NFC tap, and QR code on a large 6.5 × 4.25 inch acrylic stand. Printed in the USA with free U.S. shipping. Customers tap or scan to open your Google review link.',
      description = 'Make your business recognizable with a custom Google review stand featuring your logo, optional business name, and printed QR code. Each stand is printed in the USA and ships free to U.S. addresses, with no minimum.

The large 6.5 × 4.25 inch (165 × 108 mm) acrylic display gives your branding and QR code room on a reception desk, checkout counter, or pickup point. Its base measures 1.97 inches (50 mm).

Customers tap with an NFC-enabled phone or scan the QR code with their camera. Both open the Google review link for the business location you choose. No Tap Rater app is needed, and direct-link setup has no subscription. Customers choose whether to sign in to Google and submit an honest review.

Find your business during setup or provide its Google review link. Add your logo, check the business name and location, and approve your artwork before payment. Your stand arrives ready to use.

Place your branded Google review sign where a visit naturally finishes. Invite honest feedback from customers consistently, without rewards or selecting only people who seem happy. For multiple business locations, supply the matching review link for each stand.',
      seo_title = 'Custom Google Review Stand | Printed in USA',
      seo_description = 'Custom Google review stand with your logo, NFC and QR. Large 6.5 × 4.25 inch acrylic display, printed in the USA. Free U.S. shipping.',
      product_faqs = '[{"question":"Can I customize the Google review stand with my logo?","answer":"Yes. Add your logo and optional business name during setup. Your custom design includes a QR code for your Google review link, and NFC opens the same destination. Preview and approve the artwork before payment."},{"question":"How big is the custom Google review stand?","answer":"The acrylic display measures 6.5 × 4.25 inches (165 × 108 mm), with a 1.97 inch (50 mm) base. It provides room for your logo and QR code at a checkout counter or reception desk."},{"question":"Is the stand printed in the USA, and is shipping free?","answer":"Yes. Your custom Google review stand is printed in the USA. Shipping is free on U.S. orders, with no minimum. The stand arrives ready to use; direct-link NFC and QR setup has no subscription."},{"answer":"Share your Google Business Profile review link after a real customer experience and invite honest feedback. An NFC Google review stand puts that link within reach at checkout or reception. Do not offer rewards for reviews or ask only satisfied customers. Customers still choose whether to review and must sign in to Google.","question":"How can I make it easier for customers to leave a Google review?"},{"answer":"Use the review link for the correct location from your Google Business Profile, or find your business during stand setup. Check the business name and location before approving the artwork. NFC and the printed QR code open the same destination.","question":"Which link should I use for my Google review stand?"},{"answer":"No. The tap opens your destination. The customer decides whether to sign in, choose a rating, and submit a review. Purchasing a stand does not purchase reviews or a particular rating.","question":"Does tapping the Google stand automatically leave a review?"},{"answer":"Yes. Each location needs its own physical stand. You can put several stands at the same location and link them all to the same destination. When ordering for another location, supply the link you want visitors there to open.","question":"Can I use several stands at one location?"}]'::jsonb,
      updated_at = now()
  WHERE slug = 'google-review-stand' AND updated_at = '2026-10-31T19:18:53.619462+00:00'::timestamptz;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expected products row has changed; inspect before applying SEO copy'; END IF;
  UPDATE stand_types
  SET title = 'Custom NFC Review Stands',
      description = 'Custom NFC review stands with your logo and QR code for Google, Yelp, Facebook, and more. A large 6.5 × 4.25 inch acrylic display, printed in the USA with free U.S. shipping.',
      short_description = 'Custom NFC review stands with your logo and QR code for Google, Yelp, Facebook, and more. A large 6.5 × 4.25 inch acrylic display, printed in the USA with free U.S. shipping.',
      long_content = '',
      buyer_intent = 'Choose your platform, add your logo and location link, then approve your custom artwork before payment.',
      seo_title = 'Custom NFC Review Stands | Tap Rater',
      seo_description = 'Shop custom NFC review stands with your logo and QR code. Large 6.5 × 4.25 inch acrylic stands, printed in the USA. Free U.S. shipping.',
      updated_at = now()
  WHERE slug = 'review-stands' AND updated_at = '2026-08-25T15:14:04.253097+00:00'::timestamptz;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expected stand_types row has changed; inspect before applying SEO copy'; END IF;
END
$seo$;
