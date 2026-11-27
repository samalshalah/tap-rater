# Product review invitations

Open `/admin/product-reviews` (Commerce → Product Reviews). Enter a past buyer's name and email and choose **Send review invitation**. This first workflow is for the Custom Google Review Stand, including genuine purchases made before the current website. The admin previews the fixed, neutral email copy before sending.

The private, signed link expires after 90 days and accepts one submission. The customer chooses 1–5 stars, writes feedback, and can optionally take or choose a photo. No account or current website order number is required. Review and photo publication permissions are separate and unchecked by default. Customer email addresses are never displayed publicly.

Submitted reviews appear in the same admin screen. Publish only authentic, relevant feedback with customer permission, regardless of rating. **Keep private** / **Unpublish** removes the review from the storefront and its rating calculation. Review text is not editable by the admin. An invitation is not proof of purchase, and this workflow does not add a verified-purchase badge. Use previous order records to verify authenticity when moderating. Customers can reply to the invitation to correct or withdraw feedback.

Published reviews appear on `/product/google-review-stand` with the actual average and count. Up to 50 recent reviews are displayed, with the total rating based on all published reviews. Product JSON-LD uses the same data; it contains no review or rating properties when there are no published reviews. Google decides whether to display rich results.

## Runtime and privacy

- Apply `docs/sql/product-review-invitations.sql` before releasing. It only adds a table and indexes; it changes no existing commerce tables. RLS is enabled without anonymous policies; server access uses the existing database owner connection.
- Reuses `DATABASE_URL`, `CUSTOMER_SESSION_SECRET` (or admin signing secret), Resend configuration, and `PRODUCT_MEDIA_BUCKET`. No new cron or polling job is added.
- Email sends use an atomic reservation, a provider idempotency key and a 24-hour resend limit. An interrupted send can be retried after 10 minutes. Accepted mail is shown as sent; delivery/bounce events remain in Emails & Notifications.
- Photos are resized to at most 1,600 px in the browser, then validated and stripped of JPEG metadata on the server. Private keys use `product-reviews/`, outside the public `products/` namespace. The photo route checks publication and both permissions, or admin authentication. Responses are `private, no-store` so withdrawn photos are not served from the application cache.
- Invitation pages are noindex, no-referrer and private/no-store. Their URLs are excluded by the analytics allowlist. Rotating the signing secret invalidates previous invitation links.
- The public product page fails safely to an empty review section if review storage is temporarily unavailable. Admin and submission errors remain visible so a failed operation is not represented as successful.

## Verification

Unit tests cover signature tampering/expiry, validation, permissions, admin authentication, request origins, private photo access, metadata stripping and rating schema. The opt-in integration tests and photo script are pinned to the disposable QA branch created for this release; they mock email and refuse the production hostname. Update the allowlist only when intentionally creating a new disposable QA environment.

`node --env-file=.env.review-qa node_modules/vitest/vitest.mjs run tests/integration/product-review-invitations.test.ts`

`node --env-file=.env.review-qa --import tsx scripts/test-product-review-photo.ts`
