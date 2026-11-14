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

The Stripe connector requires reauthentication; no designated Google test Business Profile or test credentials were available. Automated substitutes do not prove provider configuration, email delivery, OAuth scopes, or scheduled production execution.

Before opening packages, use a Stripe sandbox and designated Google test profile to complete hosted payment, webhook/activation-email delivery, fresh Google authorization and location selection, full imports, a manual public test reply, an observed scheduled opt-in autopilot run, and billing-portal cancellation. Confirm the stand checkout regression in that release environment. Keep packages hidden until these checks pass.

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
