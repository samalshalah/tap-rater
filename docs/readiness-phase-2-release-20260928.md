# Readiness Phase 2: Production Release

Date: 2026-09-28

## Released

The reviewed anti-spam, technical SEO, and opt-in analytics changes are live.
This is a release verification, not a claim that the entire commerce system is
100% complete or that live payments have been proven.

- Application commit: `c3e172d2b7d2bff949eea630243d884c1650cb27` on `nextjs-commerce`, pushed to GitHub.
- Cloudflare Git build: `49b3660d-022a-4e32-a5c1-fbb67e7efbe5`, successful.
- Verified initial Worker version: `8b1c6cd6-6601-45cb-a3b7-5a97a3b432f9`, 100% traffic at 2026-09-28 14:21:54 UTC.
- Worker: `tap-rater-app-git`; production: `https://taprater.com`.
- Existing encrypted secrets preserved. No secret values copied into release source or this report.
- Stripe remains TEST. No checkout session, payment, order, refund, or subscription was created.

## Build Evidence

- Fresh isolated snapshot with its own locked `npm ci`; no shared writable dependencies or copied environment secret files.
- 155 test files passed, 3 skipped; 1,295 tests passed, 9 skipped.
- Next production compilation, TypeScript, and generation of 131 static pages passed.
- 1,023 optimized image variants generated.
- 48 recovery configuration checks passed.
- OpenNext packaging and Wrangler dry-run passed: 1,863 assets, approximately 2,456 KiB gzipped Worker.
- Cloudflare's separate Git build/test/deploy completed successfully.

## Live Checks

- Contact/setup/link-change widgets use the real production site key; the public configuration endpoint is `no-store`.
- The two support edge limiters are bound: 3 attempts/60 seconds and 1 normalized duplicate/60 seconds.
- Production CSP permits Turnstile and excludes `unsafe-eval`.
- One clearly labeled `RELEASE-QA-20260928` contact submitted through the live browser with automatic Turnstile verification succeeded.
- Database verification: exactly 1 QA contact, 0 setup requests, 0 link-change requests, 0 orders.
- Exactly 1 `support_request_admin` notification was accepted and delivered on the first attempt (14:23:31 UTC). The QA record remains identifiable; no cleanup was performed.
- Missing-token submissions to all three routes returned HTTP 400 and created no extra records or notifications.
- A fourth immediate missing-token probe also returned 400, not 429. Edge limiter configuration is confirmed, but strict fourth-request rejection was not demonstrated. These approximate edge throttles are not an exactly-once guarantee.
- Initial visits to all three forms at 320px fit without horizontal overflow; verification completed and enabled each submit control. Only the contact form was submitted.
- Public homepage, shop, product, collections, review-link helper, support forms, robots, sitemap, login, and activation smoke checks passed.
- `/category/custom-stands` permanently redirects to `/custom-stands`.
- Private account pages return `noindex, nofollow, noarchive`; setup and link-change forms expose `noindex, follow`.

## Analytics And Google

- Production GA4 stream: `G-MVBHN8KW2S`, property `555155326`; enabled only after explicit consent. Manual-measurement settings verified; Enhanced Measurement remains off.
- No Google requests observed before consent, after Reject, after withdrawing consent, or on the account login route.
- Acceptance sent sanitized product `page_view` and `view_item` events to the correct stream. Google Analytics Realtime received both events and displayed the test visit.
- Test browser preference restored to Reject. No synthetic purchase sent.
- `purchase` is configured as a key event. This is configuration evidence, not received purchase evidence.
- Sitemap HTTP 200: 89 unique HTTPS URLs on taprater.com. Includes Appointments, Feedback, and review-link helper; excludes account/admin/cart/checkout and setup/link-change utilities.
- Google Review Stand canonical excludes the design query. ProductGroup has Standard USD 39 and Branded USD 49 offers with distinct SKUs and selectable variant URLs, plus breadcrumbs.
- Search Console's existing sitemap submission is successful (submitted September 23, last read September 26, 89 discovered pages).
- Search Console: homepage and shop are indexed; Google Review Stand was discovered but not indexed. The new indexing request was accepted into the priority crawl queue. No ranking or indexing guarantee.

## Final Resize Correction

The live initial-mobile checks passed, but narrowing an already-loaded desktop form
left Turnstile's original flexible widget wider than the available space. The
follow-up source change observes the form container and recreates the widget only
when crossing the 300px compact/flexible threshold, clearing the old token through
the existing cleanup. No request data is discarded.

Local desktop-to-320px verification passed without a refresh: document width 305px,
viewport 320px, verification completed and Send message enabled. Existing security
and analytics regression suites passed: 65 tests. The follow-up commit includes
this correction and this release record; verify its Cloudflare deployment before
reporting the resize correction live.

## Remaining, Not Repeated Work

1. Optional Search Console-to-GA4 integration awaits the owner's answer to the specific data-sharing approval. Neither account depends on this link to collect its own data.
2. Genuine paid live-order/GA4 purchase verification requires separate live Stripe activation and transaction authorization. Keep it deferred; do not send fabricated purchases.
3. Cart quantity-event deltas, checkout-event delivery, and GPC are covered by automated tests, not newly demonstrated in the live browser in this release pass.
4. Merchant Center, accurate shipping/return structured data, and remaining unique page imagery belong to the later SEO/content phases, not this release.

## Evidence

Local artifacts: `artifacts/readiness-phase-2-20260928/`.

- `live-contact-success.png`
- `live-contact-mobile.png`
- `ga4-realtime.png`
- `indexing-requested.png`
- `search-link-approval.png`

Screenshots and the isolated build directory remain local; do not commit generated
builds, credentials, unrelated dirty documents, or archived artifacts.
