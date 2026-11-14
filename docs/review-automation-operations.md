# Review automation operations

## November 14 launch-readiness update

Deployed with owner authorization as Worker version `407657af-4eb5-4230-b6e6-3b8daa13d59a`; see `google-reviews-launch-validation.md` for acceptance evidence and remaining provider tests.

Google Reviews sales remain disabled in `marketing-sales.ts`; Google Growth remains paused in `business-optimization-feature.ts`. Do not open sales based solely on the automated checks below.

New Google connections import reviews with AI, low-star drafting, and automatic posting off. Customers enable AI in Reply settings and separately confirm public 4–5-star posting. Reconnecting preserves existing settings. Low-star replies require manual submission. Existing production locations may already have publishing enabled; the historical draft-only policy below does not describe their current behavior.

Customer discovery and binding require that customer's own Google connection; a shared manager connection can continue servicing an existing assignment but cannot expose its location directory to the customer. Reviews onboarding completes when all review pages finish, independently of paused profile optimization. Usage displays the effective location allowance, including overrides.

`reviews-customer-journey-integration.test.ts` exercises checkout, paid activation, imports, editing, publishing reconciliation, consent, allowances, and subscription revocation on the dedicated QA branch. It simulates Stripe, Google and activation-email delivery. Its exact endpoint guard prevents use against production. Use `REVIEWS_JOURNEY_DATABASE_URL` only for that branch; credentials must never be committed. The local component harness is `node tests/fixtures/reviews-launch/serve.mjs`; it makes no external service requests.

Before reopening packages, complete a real Stripe test Checkout and portal cancellation with webhook delivery and activation email, fresh Google OAuth with a designated test Business Profile, paginated import, manual reply, and an observed scheduled opt-in autopilot run. External checks remain unverified because the Stripe connector needs reauthentication and no Google test profile has been designated. Keep the public sales gate closed until those checks pass.

## Historical draft-only workflow (October 23)

The following records the October 23 operational workflow and its evidence. Do not activate customer pricing when diagnosing automation.

## Scheduled work

- `custom-worker.ts` invokes `/api/internal/google-reviews` first on the existing `*/15 * * * *` trigger, with the internal secret supplied by the Worker binding.
- The authenticated route imports one Google page per eligible location and prepares at most one reply draft per location per run. Pagination and remaining drafts continue on later runs. The batch rotates through up to 12 locations.
- Eligibility requires an active customer, current marketing access, an enabled assignment, and the same connected Google identity. AI additionally requires location-specific consent and the shared daily allowance (20 generations per location).
- All ratings qualify for drafts. Existing replies, human drafts, and approvals are preserved. An optimistic version/claim check protects against concurrent edits and revoked settings. Scheduled processing never calls a Google write method.
- `auto_enabled` is a legacy **publishing** setting and must remain false. It is not the automatic-drafting switch; `ai_consent` controls drafting.

## Verify execution, not just configuration

1. Confirm the trigger exists and the deployed Worker exports `scheduled`.
2. Observe an actual Cron event in Cloudflare history or `wrangler tail`. A configured trigger or a successful manual sync alone is insufficient.
3. Look for `google_review_maintenance_started`, then `google_review_maintenance` with HTTP status and import/draft counts. Logs must not contain review text, reply text, credentials, or customer contact data.
4. Match the run to that location's `synced_at`, `next_page`, `last_error`, `draft_checked_at`, and `draft_error`. A quiet AI queue now records a check time without consuming AI or clearing retry errors. The customer can see both times under automatic import settings.
5. Verify new drafts have no approval or publishing attempt. An existing Google reply is not evidence of a Tap Rater publishing attempt.

On October 23, the dashboard initially showed October 18 as its latest Cron event despite the schedule still being listed. The same trigger was recreated at 2026-10-23 15:17:40 UTC. However, delayed tail output subsequently confirmed that the **15:15:32 UTC scheduled invocation had already succeeded before that recreation**: review maintenance logged `ok:true`, the invocation outcome was `ok`, and there were no exceptions. Therefore, the old dashboard history was not proof of scheduler failure, and the recreation must not be credited as a proven fix. Norah's production import advanced to 15:17:44 UTC without an agent-triggered manual import during this verification. The new draft-check timestamp starts recording with the deployment below, including when no draft is needed.

Verification on October 23: 50 focused unit/privacy/access tests passed; both isolated database integration tests passed; the two-location test also passed separately using real Cloudflare inference and the staging usage ledger. Norah retained 22 reviews and two unapproved drafts. No new real review was fabricated to test production. Production version `b22d7bb4-7415-422a-b1b8-e2dc16e51f3f` adds quiet-queue check timestamps, customer-visible check times, and scheduled import result counts, and runs review maintenance before other maintenance jobs. No production schema change or pricing activation was needed.

## Isolated regression tests

`google-automatic-drafts-integration.test.ts` exercises concurrent claims, approval preservation, and safe negative-review drafting against the explicitly allowlisted staging endpoint.

`review-import-ai-integration.test.ts` imports simulated new Google reviews into two synthetic locations, runs the production draft-generation path, checks location and usage attribution, and proves repeated work does not duplicate or publish replies. Fixtures are removed after the test. It never inserts synthetic reviews into production or sends Google writes.

Set `LOCAL_MANAGEMENT_TEST_DATABASE_URL` to the allowlisted staging branch. To additionally exercise real inference, set `REVIEW_AUTOMATION_LIVE_AI=1`, `REVIEW_TEST_CF_ACCOUNT`, and `REVIEW_TEST_CF_TOKEN` in the process environment. Credentials must not be committed or logged. Real-AI mode uses the configured model and metering code against staging; it can incur provider cost. Without that flag, the generator is deterministic.
