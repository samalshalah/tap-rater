# Google Reviews launch validation — November 14, 2026

Status: owner authorized the imports-and-drafts-only public launch for new subscribers on November 14. Existing accounts, including the owner's main account, retain their reply features. The historical full-posting acceptance gaps below do not gate this reduced package; they remain requirements before offering posting/autopilot to new subscribers.

## Imports-and-drafts-only release

Follow-up: the public package page now reads the signed-in customer's existing service entitlement, just as Subscription management already did. Manually managed active accounts show Google Reviews access and do not receive a duplicate purchase form merely because they lack a Stripe subscription. Guest purchasing is unchanged. This is read-only presentation logic; no customer, location, entitlement, or reply-setting writes are involved. Four regression cases cover existing/absent access, guests, and access-check failure. The release suite passed 2,449 tests with 31 environment-gated skips; TypeScript passed.

New Checkout subscriptions carry server-authored `reviews_mode=draft_only` metadata. The signed subscription handler atomically inserts a persistent customer policy with entitlement processing. Existing subscriptions without this metadata are not enrolled. Migration `supabase/2026-11-14-reviews-draft-only.sql` creates an empty policy table without updating customer, location, or reply settings; production verification confirmed the main account is not restricted.

Both manual and worker publishing reject restricted accounts before accessing Google. Autopilot opt-in is rejected, scheduling excludes restricted customers, and the account UI hides posting, autopilot, and scheduling controls. Import, draft generation, saving, and copying remain available. The global publishing setting stays unchanged for existing accounts. Package, Stripe Checkout, and thank-you copy explicitly exclude posting/autopilot. The public header links to the standalone Reviews package; the stand checkout still excludes subscription add-ons. Google Growth/optimization/heatmaps remain paused.

Release verification covers the changed policy, old-account behavior, subscription metadata/entitlements, and the standard build/cache/deployment checks. No repeated live customer journey, payments, Google account moves, or public replies were performed.

Deployed release `bfb562a` to production and pushed `nextjs-commerce`. Active Worker version `703cae9f-8eae-496e-860e-6813c1490376` (100%) and live build `VYjVZ4HD0t8aP-QXDVOeM` matched after the push. Package route is now 200; checkout remains 200; Growth remains 307 to `/shop`. Browser verification shows the Google Reviews navigation link, $29/location/month, 1,000 AI draft generations, and explicit posting/autopilot exclusions. Main account policy lookup remains false; no existing customer was enrolled in the new restriction. Evidence: parent-workspace `archives/google-reviews-fixes-2026-11-14/reviews-drafts-launch.jpg`.

TypeScript, production build, public-cache checks, and Wrangler dry-run passed. The release suite had 2,442 passes and one outdated sales-pause assertion; that assertion was corrected to exercise the retained runtime emergency switch and all four affected files passed (40 tests). Two additional webhook-policy cases passed in the subscription suite (13 tests). Global live publishing remains configured as before; the new restriction is enforced per subscriber, including worker publishing and scheduling. Rollback application version is `a454804e-3db1-4081-b0ff-c151c6ff05c0`; retain the additive policy table and do not remove policy rows during a rollback.

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

Fresh Google OAuth, live Norah retrieval, deployed discovery/duplicate-assignment protection, and isolated onboarding completion/UI replay have passed, as recorded below. The deployed customer setup wizard has not been exercised end to end with a separate location assignment. A reviewed public reply and observed scheduled opt-in execution remain unverified and are expressly excluded by the owner. The Stripe app connector still needs reconnection separately from the working Chrome session; connector reauthentication is not a customer-service launch blocker.

For a complete production acceptance run, obtain a legitimate Google Business Profile that is not assigned to an existing Tap Rater workspace, with owner permission and a Google account that manages it. A controlled live QA subscription purchase would require owner authorization for the $29 monthly charge plus any applicable tax and the owner completing payment; verify the genuine production subscription event, activation/access, setup/import, billing portal, and cancellation afterward. Keep public packages hidden during any private acceptance run. Existing real Stripe sandbox lifecycle tests already passed; this is the remaining production continuity check, not a claim that payments are broken.

To verify the advertised posting features later, the owner must explicitly authorize the exact review and approved reply text on a designated business, plus a separate suitable 4–5-star unanswered review for scheduled autopilot verification. Inspect and restrict pending work before any opt-in so older reviews cannot be posted unintentionally. Until that authorization exists, do not post or enable automatic replies. A read-only/import-and-draft pilot would instead require appropriately reduced product promises and enforced publishing restrictions.

Before opening packages, complete the remaining checks above with a designated Google test profile and confirm stand checkout in the release environment. Keep packages hidden until these checks pass. Review subscription tax requirements before launch; no tax collection settings were changed in this test.

### Production portal wording — verified November 14

The owner authorized correcting production portal wording. The Stripe connector required reauthentication, so the signed-in Sam Chrome Dashboard was used for live account `acct_1U1TpKJfXGmPO60V`. The live Portal header was blank (not “Google Growth”). Saved “Manage your Tap Rater Google Reviews subscription.” and verified persistence after reload in the Default configuration `bpc_1Ubo3uJfXGmPO60VUPJE4qhG`. Only the headline field was edited; no checkout, payment, cancellation, tax, or subscription controls were edited, and the public portal link was not activated. No payment or public reply was made. Packages remained 404, Growth 307 to `/shop`, and checkout 200. Evidence: parent-workspace `archives/google-reviews-fixes-2026-11-14/production-reviews-portal-wording.jpg`.

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

## Isolated remaining setup test — 2026-11-14

At the user's request, the remaining onboarding handlers were exercised against the exact dedicated QA database using the previously retrieved live Norah review data. Authentication was injected for a temporary synthetic QA customer; Google responses were replayed with synthetic resource IDs. Production credentials and ownership were not copied. The network guard validates both the Neon API destination and the exact database hostname in the connection header, rejecting Google and other external requests. Publishing remains locked.

Passed: unlicensed access denial, initial setup state, business selection and repeat-selection idempotency, refusal to finish before connection or during partial import, three-page import of all 22 reviews, saved progress, completion persistence, and no redundant import after completion. Existing content-fidelity, customer isolation, draft editing, stale edit rejection, approval, and publishing/automatic-posting denial checks also passed. No replies were scheduled or published. Temporary database records were cleaned up and zero temporary test accounts remained. The 27 focused tests and TypeScript passed.

The local browser harness uses the actual `FirstLoginSetup` component and only the state responses captured by this integration test. It is a UI replay, not another live Google authorization or a production end-to-end session. Browser checks passed: import progress, reload/resume at 10 of 22 reviews, 100% completion with 22 reviews, and Open dashboard dismissing setup to reveal the QA dashboard placeholder. Production Norah's assignment/settings fingerprint remains unchanged; packages return 404, Growth redirects to `/shop`, and checkout returns 200. No application deployment or sales-flag change is required. The local server was stopped after verification. Evidence: parent-workspace `archives/google-reviews-fixes-2026-11-14/isolated-norah-setup-complete.jpg` and `isolated-norah-qa-dashboard.jpg`.

Reproduce the isolated import/onboarding test and local screen replay:

```powershell
$env:REVIEWS_READONLY_SNAPSHOT_TEST='1'
node --env-file=.env.reviews-qa node_modules/vitest/vitest.mjs run tests/unit/reviews-readonly-snapshot.test.ts
node tests/fixtures/reviews-launch/serve-onboarding.mjs
# Open http://127.0.0.1:4183/onboarding.html
```

The captured state file lives under ignored `.local-sandbox/`; no review text, tokens, or production credentials are served by the onboarding replay endpoint.

## Reproduce

### Deployed customer setup follow-up — 2026-11-14

The activated QA alias was granted a manual one-location Reviews licence through the admin UI, expiring November 21, with zero monthly AI attempts. This is test access, not a paid subscription. The account remains active. Its customer navigation exposed Reviews; the setup wizard found Norah Boutique at 50 Massachusetts Ave NE, Washington, DC and created a separate, unconnected QA workspace (`a3ace447-152d-461b-9a5c-4e053c7b46a8`). No existing location was moved.

After the user signed the QA account into Hussam Chrome, the deployed Connect Google flow completed fresh OAuth for hussam.alshalah@gmail.com using the existing granted scopes. The callback returned to the correct QA workspace; discovery returned 37 locations and automatically matched Norah Boutique at the correct address. A confirmed connection attempt was safely rejected with: “This Google business is already connected to another workspace. Contact Tap Rater to arrange access. Signing in again will not resolve this.” The production unique parent/location indexes were verified before the attempt. No assignment was moved or bypassed.

The production QA account remains active, with zero Google links, zero imported reviews, and incomplete onboarding. Its separate scoped Google authorization was retained for continued testing. Fresh OAuth, discovery, and duplicate-assignment protection passed; completing the deployed wizard with Norah is blocked by the required preservation of its existing assignment. Do not claim the full deployed wizard passed. The earlier isolated live read/import remains separately validated. Evidence: parent-workspace `archives/google-reviews-fixes-2026-11-14/qa-norah-assignment-protected.jpg`.

The Norah ownership/connection/AI/autopilot fingerprint remained identical before and after the QA setup actions. The focused onboarding, paused-sales, checkout-route, read-only snapshot import, and Google network-guard suites passed (27 tests across five files). Live checks returned packages 404, Growth 307 to `/shop`, and checkout 200. No public replies or new payments were made. Evidence: parent-workspace `archives/google-reviews-fixes-2026-11-14/qa-setup-test-licence.jpg`.

```powershell
npm test
npx tsc --noEmit
node --env-file=.env.reviews-qa node_modules/vitest/vitest.mjs run tests/unit/reviews-customer-journey-integration.test.ts
node tests/fixtures/reviews-launch/serve.mjs
npm run cf:build
npx wrangler deploy --dry-run
```

The ignored `.env.reviews-qa` supplies only the dedicated QA database URL. The integration test rejects every other endpoint. Never commit credentials or use this test against production.
