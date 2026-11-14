# Google Reviews launch validation — November 14, 2026

Status: deployed November 14, 2026 with owner authorization; packages remain hidden. Real provider acceptance is still required before launch.

Current production Worker version: `a454804e-3db1-4081-b0ff-c151c6ff05c0`. Build ID: `SX9CO3WA_GHhDM6WLbTsA` (verified against the live `/BUILD_ID` after pushing release `3c4c1cc`). Includes the cancellation correction and the admin activation-email action. Previous version for rollback: `c2db6d3c-6dec-4971-9bae-7329dabbace5` (cancellation correction only). Initial readiness release: `407657af-4eb5-4230-b6e6-3b8daa13d59a`.

Post-deployment checks passed: public route smoke tests; Reviews packages return 404; purchase API returns 503 without contacting Stripe; Growth redirects to `/shop`; unauthenticated review access returns 401. The existing configured stand cart opens checkout at $49 before tax with free shipping, optional account creation, and no subscription. No live payment was submitted. Public cache regression checks passed before deployment; runtime variables were preserved with `--keep-vars`.

Base: production branch `origin/nextjs-commerce`, commit `757c1b7ebdeaa2ce9a8b5eb689fb9299fb755f65`. Work branch: `fix/google-reviews-launch-readiness`.

## Fixed

- Customer Google discovery and binding cannot use a shared manager or another customer's connection. Existing managed review imports retain their assigned connection.
- New connections start with AI and automatic posting disabled. Public 4–5-star autopilot has a separate confirmation explaining older reviews, scheduling, and allowance. Reconnecting preserves saved settings.
- Reviews onboarding no longer depends on the paused Google profile optimization refresh.
- The displayed monthly allowance includes the location override, including zero.
- Added a gated Google Reviews purchase page and form, accurate subscription disclosures, a payment-pending thank-you page, and compatibility for previous thank-you URLs. Checkout retries retain their attempt across cancellation and refresh. Signed-in buyers can resume unfinished checkouts.
- Google Growth remains paused. Reviews sales remain disabled in code, and the new package route returns not-found while disabled. Stand checkout logic and the approved public wave were not changed.

## Verification

- Full automated suite: 2,437 passed, 29 skipped (322 passed files, 23 skipped files). External integration tests retain their environment guards.
- Dedicated QA database customer journey: passed separately, using synthetic records and simulated Stripe, Google, and activation-email delivery. Covers checkout idempotency, payment-gated access, password activation/token reuse prevention, duplicate subscription protection, two-page imports, cross-customer denial, draft editing/approval and stale edits, uncertain-post reconciliation without duplicate publishing, explicit posting consent, monthly cap override, past-due access, renewal cancellation, and final cancellation. Synthetic records are removed in test cleanup.
- Browser test of real React components with local simulated endpoints: two-location checkout, matching retry attempt after cancellation, AI off by default, consent decline, consent acceptance, disabling autopilot, and independent low-star drafting passed. This is component-level browser testing, not a real hosted Stripe or Google OAuth session.
- TypeScript check, Cloudflare production build, Wrangler deployment dry-run, and whitespace check passed. Deployment was subsequently authorized and verified as recorded above.
- Added regression tests proving code-level sales pause overrides environment switches and Google Growth remains disabled.

## Remaining launch acceptance

### Real Stripe sandbox acceptance completed later November 14

Used Sam's signed-in Chrome session to access the existing private Tap Rater sandbox `acct_1U1TpVJEgI4VUlPP`. Reused its existing test keys only in ignored local QA configuration. No live Stripe keys, payment settings, or production sales gates changed.

- Real Stripe API lifecycle integration passed against the dedicated Neon QA branch: standalone and bundled Checkout amounts, retry idempotency, duplicate purchase prevention, paid activation, location and generation allowances, billing portal creation, cancellation, and access revocation.
- Real hosted $29 monthly Checkout passed with a standard Stripe test card. A declined test card first showed the decline message, left payment unpaid, and granted no access; retry succeeded.
- Stripe CLI forwarded genuine signed `invoice.paid`, `customer.subscription.created`, `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` events into the production webhook handler running locally against QA. All five returned HTTP 200. Invalid signatures were rejected. Account activation passed; email delivery was simulated.
- Customer billing-portal cancellation passed. Access remained active for the paid period; final sandbox cancellation revoked access. The test subscriptions were canceled and the temporary listener stopped.
- Sandbox portal heading was corrected from Google Growth to Google Reviews. Production portal copy was not changed or verified.
- Acceptance run: session `cs_test_a0EfNYftilUiyuo9pp7dMh9cnOCHqnjQh6xVug2k55KGUejkg4vGpMytIv`; subscription `sub_1Ubi0IJEgI4VUlPPyf16Sl8m`.

The real portal exposed a cancellation mapping bug: Stripe can set `cancel_at` while leaving `cancel_at_period_end=false`. The correction recognizes both forms and caps entitlement expiry at the earlier cancellation date. Hosted acceptance passed after the fix; 2,438 unit tests and TypeScript also passed. The fix was deployed with owner authorization on November 14 at 14:41 UTC as Worker `c2db6d3c-6dec-4971-9bae-7329dabbace5`, build `L5QMJnOPsemoxipSXhjlm`, release commit `93fb5a3` on `nextjs-commerce`. Active version and live build ID matched after pushing. Production smoke and cache checks passed; variables were preserved.

### Production webhook verification

- Live destination `we_1U4fx8JfXGmPO60V40lmMASQ` is active at `https://taprater.com/api/webhooks/stripe`, API version `2026-07-29.dahlia`. All 13 required existing checkout/refund and subscription/invoice events remain subscribed. No Stripe live configuration changed.
- Stripe showed four successful deliveries and zero failures this week before the check.
- Replayed already-completed live checkout event `evt_1UbROZJfXGmPO60VDpEzJARZ` at November 14, 09:42:33 EST. Stripe confirmed HTTP 200 and `received: true` from the new deployment. The existing completed recovery record was checked before and after; its attempt count and timestamp stayed unchanged, confirming duplicate processing was skipped.
- Missing and invalid signatures both returned HTTP 400. Packages returned 404, Growth redirected to `/shop`, and stand checkout returned 200.
- This verifies actual production signed delivery and idempotency. New subscription lifecycle processing was verified in the isolated real Stripe sandbox described above; no live purchase was made.

Reproduce real acceptance by starting `node --env-file=.env.stripe-reviews-qa tests/fixtures/reviews-launch/stripe-listener.mjs`, then setting `REVIEWS_HOSTED_STRIPE_TEST=1` and running the hosted acceptance test with both ignored QA env files. Complete only its sandbox Checkout and portal links. This does not enable public packages. Credentials and session bearer URLs must remain out of version control.

### Still required

Fresh Google OAuth and live read-only retrieval now passed for Norah Boutique in isolated QA, as recorded below. The deployed customer setup wizard has not been exercised end to end with a separate location assignment. A reviewed public reply and observed scheduled opt-in execution remain unverified and were expressly excluded by the owner. The Stripe app connector still needs reconnection separately from the working Chrome session.

Before opening packages, complete the remaining checks above with a designated Google test profile and confirm stand checkout in the release environment. Keep packages hidden until these checks pass. Review subscription tax requirements before launch; no tax collection settings were changed in this test.

No real customer payment, public Google reply, or Google Growth activation was performed. Production changes were limited to the authorized releases, a signed idempotent webhook replay, and the isolated activation-email QA account described below.

### Production activation-email delivery verified

- Added an admin-only Send activation email button for pending accounts, using the existing authenticated endpoint and its five-minute cooldown. The endpoint existed without a corresponding customer-list action. Existing licence controls remain intact.
- All 2,438 tests, TypeScript, Cloudflare build, public-cache checks and deployment dry-run passed again. Deployed with preserved variables at 14:46 UTC; production branch and active build were verified. Public smoke tests passed, `/checkout` stayed 200, packages stayed 404, and Growth stayed a redirect to `/shop`.
- Created the clearly labeled `QA Activation Delivery 2026-11-14` customer (`e9018ee7-1bd2-49ae-8b9a-e62a3508d5da`) using the owner's Gmail QA alias, without purchases, licences, locations or Google access. Used the new admin button on production to send the real activation email.
- Delivery ledger: accepted `2026-11-14T14:46:50.331Z`, delivered `2026-11-14T14:46:51.365Z`, no failure reason. Independently opened the received message in the owner's Gmail Inbox: subject Activate your Tap Rater account, sender support@taprater.com, activation link on taprater.com, seven-day expiry notice.
- Retained the synthetic record for audit, disabled it and cleared its activation token after checking delivery. No production password was created. Password activation and single-use token behavior were already tested in isolated QA.
- Evidence: `archives/google-reviews-fixes-2026-11-14/activation-email-delivered.jpg` and `production-webhook-replay.jpg` in the parent workspace.

### QA account activation completed

The owner requested that the QA alias remain enabled for continued testing. Restored only this synthetic customer to pending activation and resent its activation email; delivery was confirmed at `2026-11-14T15:11:15.220Z`. The owner then completed password setup using the new link. Verified the production record is now active, has a password, and has consumed its activation token. The browser displayed the customer dashboard with no purchased stands. The QA account has zero locations and no active Reviews licence; no paid entitlement was fabricated. It remains enabled. The main account and its locations were not modified.

The owner confirmed that no separate Google Business Profile is currently available. Live Google OAuth, import, public reply, and scheduled posting acceptance remain blocked on that prerequisite. Do not use or move the main account's locations for these tests. Reviews packages remain hidden (404), Growth remains paused (redirect to `/shop`), and stand checkout remains available (200). No additional deployment was needed for this activation check.

### Existing-location isolated snapshot test

The owner authorized choosing an existing location for an isolated read-only test, without moving it, changing the main account, or posting replies. Selected Norah Boutique, 50 Massachusetts Ave NE, Washington, DC. Read its 22 previously imported reviews (last recorded sync `2026-11-14T16:01:01.437Z`) from production and retained only review IDs, ratings, text, timestamps and existing reply content in an ignored local fixture; no Google tokens, reviewer names or profile images were copied.

`reviews-readonly-snapshot.test.ts` passed on the exact allowlisted QA database. It replayed the stored data through the production binding, paginated import, workspace, draft and approval functions using a temporary synthetic customer and location. All 22 reviews imported across three pages with content intact. Unauthorized customer access and stale edits were rejected. Manual publishing and automatic-posting configuration were rejected with publishing disabled; no replies were scheduled and the publishing adapter was never called. Network access was restricted to the Neon database API; no Google or AI requests were made. Temporary QA records were removed afterward. The activated production QA alias remains active and unchanged.

A before/after fingerprint confirmed the original production customer assignment, connection owner, Google resource, enabled state, AI consent, autopilot setting and settings version were unchanged. This is snapshot-based integration acceptance, not fresh Google OAuth or live Google API import acceptance. Live reply publishing remains intentionally untested. No deployment or sales-gate change was made.

### Fresh Google OAuth and live read-only import completed

On November 14, the owner authorized a separate QA OAuth client and live read-only testing of Norah Boutique. Created client `130192868056-uo57d81nb55uf9lqaoiai0dlqn5pjk8q.apps.googleusercontent.com` in the existing approved Google project with only `http://localhost:4184/api/admin/google-business/callback`. The production OAuth client was not edited. The new client's secret stays in ignored local QA configuration.

Used the existing Google manager identity for this location, `hussam.alshalah@gmail.com`, through a fresh sign-in. Google confirmed the app already held the requested identity and Business Profile permissions. The local runner used production OAuth state/PKCE, encrypted token storage, token exchange and Google client code, with an exact QA database guard and a network allowlist. Only token exchange, user-info, location discovery in the selected account, and Norah Boutique review GET requests were permitted; reply writes and revocation were blocked. The production Tap Rater QA/main accounts were not used or modified by this local runner.

Google returned HTTP 200 for token exchange, user-info, location discovery, and reviews retrieval. All 22 reviews were fetched in one actual Google API page. The fresh data then passed the isolated application import/draft/access tests, split into three replayed pages to exercise pagination. Both integration and network-guard tests passed, along with TypeScript. This verifies fresh provider authorization/read access and application import of live data; it is not a claim that the deployed customer wizard or public reply posting was tested.

Removed the temporary QA OAuth connection after the read (verified zero remaining `qa:norah-readonly:` connections), cleaned the synthetic import records, and stopped the localhost runner. No production database writes or Google Business Profile writes occurred. The separate QA client remains available but has no test tokens retained in QA storage. A before/after fingerprint confirmed Norah's original customer assignment, connection, enabled state, AI/autopilot settings and settings version were unchanged. Packages still return 404, Growth redirects to `/shop`, and stand checkout returns 200. No deployment was required.

Evidence: parent-workspace `archives/google-reviews-fixes-2026-11-14/norah-live-google-read.jpg`; ignored local `.local-sandbox/google-live-readonly-result.json` contains the sanitized HTTP audit without tokens or review text.

## Reproduce

```powershell
npm test
npx tsc --noEmit
node --env-file=.env.reviews-qa node_modules/vitest/vitest.mjs run tests/unit/reviews-customer-journey-integration.test.ts
node tests/fixtures/reviews-launch/serve.mjs
npm run cf:build
npx wrangler deploy --dry-run
```

The ignored `.env.reviews-qa` supplies only the dedicated QA database URL. The integration test rejects every other endpoint. Never commit credentials or use this test against production.
