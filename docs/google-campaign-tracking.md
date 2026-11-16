# Google campaign tracking

## Release scope

Deployed with owner approval on 2026-11-16 from `fix/google-campaign-tracking`, commit `5cfc5d0`, using `--keep-vars` under `docs/deployment.md`.

Production Worker version: `7768e4d5-5ac1-42f8-b6d8-7850e47f9d4e` (100%). Verified `/BUILD_ID`: `gnz3ezEdnKsPgU4RQDhar`, matching the tested bundle.

- First-time public visitors are offered the existing analytics consent controls once analytics configuration loads. Existing decisions, internal-browser exclusion and Global Privacy Control remain respected.
- Google `gclid`, `gbraid` and `wbraid` arrivals are classified as `google / cpc`. Raw click identifiers are not stored in journey records or forwarded by this change.
- Explicit campaign labels survive the storefront journey and checkout. A new campaign arrival replaces a previous active direct session for the site's order attribution.
- With consent, the website retains the last non-direct source/medium/campaign for 30 days for return-order attribution. This is the site's attribution model, not a claim that each return was another ad click. GA4 receives current-visit acquisition labels separately.
- Rejection clears saved campaign labels and the journey session. No analytics event is sent before acceptance; unknown sources remain unknown.
- Checkout requests queue a bounded Google client/session-ID lookup even if the tag is still loading. An unavailable or blocked Google script never prevents checkout. Missing Google identity remains visible as unavailable rather than creating invented identifiers.
- Existing server-side purchase validation, transaction deduplication, refund checks, and test/internal exclusions are retained. A success-page visit is not proof of payment.

## Campaign URL

Use this landing page when creating the first stand campaign:

`https://taprater.com/product/google-review-stand?utm_source=google&utm_medium=cpc&utm_campaign=google_review_stands`

In Google Ads, the equivalent final URL suffix is:

`utm_source=google&utm_medium=cpc&utm_campaign=google_review_stands`

Use a different stable campaign label for each campaign. Labels must start with a letter and contain only letters, numbers, hyphens or underscores (80 characters maximum). For a ValueTrack campaign ID, prefix it, for example `utm_campaign=google_{campaignid}`. Do not use customer names, email addresses or other personal information in labels.

Auto-tagged clicks without a campaign label can be classified as Google paid traffic, but will not identify the individual campaign in the website report. Keep the UTM suffix even if auto-tagging is enabled.

## Where to read results

- GA4: Traffic acquisition, using session source/medium and session campaign, with purchase count and purchase revenue. GA4 property: Tap Rater - Website.
- Website: `/admin/analytics`, traffic sources and tracked live orders. Individual order details show source, campaign and landing page.
- Site attribution retains the latest consented non-direct source for 30 days; GA4 uses its own acquisition/attribution rules. Those reports need not match exactly.
- Visitors declining consent, blockers, and missing identities prevent complete attribution. The order ledger remains the authority for all actual sales.

This release does not create a Google Ads campaign, link an Ads account, or configure an imported purchase conversion. Those account-level steps and a real attributed purchase reconciliation are required before claiming Google Ads conversion reporting or automated bidding is ready. No synthetic purchase was sent to the live GA4 property.

## Verification

- Full unit suite: 2,457 passed; 31 skipped. The two tracking suites contain 67 passing tests, including paid-arrival classification, source persistence, campaign expiry, rejection, delayed Google identity, verified purchase totals, and exclusion rules.
- TypeScript and Cloudflare production build passed.
- Desktop and 390px mobile checks: first-visit prompt visible, reject hides it, rejection survives reload, footer preferences reopen, accept hides the prompt.
- Public-cache integration passed using its isolated fake database; unauthenticated edits rejected and authenticated cache invalidation verified.
- Wrangler deployment dry-run and production deployment passed. Public production smoke checks passed; authenticated Store Analytics loaded successfully.
- Live consented QA visit: site `view_item` and `page_view` requests returned 204. GA4 collection returned 204 with `google / cpc` and campaign `qa_tracking_20261116`. This confirms collection acceptance, not final processing in GA4 reports.
- Store Analytics showed the matching campaign with one session and zero purchases. After restoring the testing-browser exclusion and rejecting consent, session revocation returned 204, the QA session disappeared from business reports, and a reload sent no tracking requests. GA4 may retain the clearly labeled QA visit; no purchase event was generated.
- Live screenshot evidence: `artifacts/tracking-live-20261116.jpg` (local, untracked).

Reconcile the first genuine consented campaign order against the order ledger and GA4 after processing. No real purchase was made during deployment verification, so the complete production payment-to-GA4 path still needs that reconciliation. Do not backfill old orders with guessed campaign labels.
