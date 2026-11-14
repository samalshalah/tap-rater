# Google Reviews launch validation — November 14, 2026

Status: deployed November 14, 2026 with owner authorization; packages remain hidden. Real provider acceptance is still required before launch.

Production Worker version: `407657af-4eb5-4230-b6e6-3b8daa13d59a`. Build ID: `NsdHqcqfUf-mO9rUnWMFv` (verified against the live `/BUILD_ID`). Previous version for rollback: `98547a55-6988-402f-b2bc-0ccc2436e329`.

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

The real portal exposed a cancellation mapping bug: Stripe can set `cancel_at` while leaving `cancel_at_period_end=false`. A local correction now recognizes both forms and caps entitlement expiry at the earlier cancellation date. Hosted acceptance passed after the fix; 2,438 unit tests and TypeScript also passed. **This additional cancellation fix has not been deployed.** The production version recorded above remains unchanged.

Reproduce real acceptance by starting `node --env-file=.env.stripe-reviews-qa tests/fixtures/reviews-launch/stripe-listener.mjs`, then setting `REVIEWS_HOSTED_STRIPE_TEST=1` and running the hosted acceptance test with both ignored QA env files. Complete only its sandbox Checkout and portal links. This does not enable public packages. Credentials and session bearer URLs must remain out of version control.

### Still required

Deploy the tested cancellation correction before launch. Verify real activation-email delivery and the deployed webhook configuration; the local CLI-forwarded test does not prove production endpoint configuration. No designated Google test Business Profile is available yet. Fresh Google OAuth, imports, a reviewed public reply, and observed scheduled opt-in execution remain unverified. The Stripe app connector still needs reconnection separately from the working Chrome session.

Before opening packages, complete the remaining checks above with a designated Google test profile and confirm stand checkout in the release environment. Keep packages hidden until these checks pass. Review subscription tax requirements before launch; no tax collection settings were changed in this test.

No real customer payment, public Google reply, production data change, or Google Growth activation was performed during this work.

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
