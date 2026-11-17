# Local sales optimization release candidate — 2026-11-16

The owner selected `checkout-tracking` as the release copy. This candidate extends
`9d392de`, which contains the SEO copy's `98cfedf` plus 28 commits. It preserves the
existing live sales configuration and approved Prismatic design. No deployment,
push, live billing change, migration, Google publication or production email send
is part of this release preparation.

## Included changes

- Honor configured color surcharges and reject inactive colors; clarify size
  premiums, one-time stand pricing and optional services without changing prices.
- Preserve merchant-managed copy, sanitize retired fallback purchase descriptions,
  and respect authoritative empty Multi-Link inventory.
- Keep business-name printing on by default, leave blank names optional and retain
  explicit customer opt-out. Preserve existing logo/proof approval requirements.
- Reject forged/truncated PNG containers while retaining supported image flows.
- Recover incomplete subscriptions and terminal checkout attempts without resetting
  ambiguous requests; disclose monthly renewal and retain account/support access.
- Reuse licensed customer-owned locations during onboarding, preserve stand
  destinations, require AI consent and make missing Google resources actionable.
- Include regression and guarded sandbox test coverage for the above.

## Validation

Final candidate checks passed: 2,501 tests (35 opt-in tests skipped), TypeScript,
Next.js production build (197 pages), Cloudflare/OpenNext build, Wrangler deployment
dry run, local production-cache/authentication integration, and 1,705 generated
image variants. The production dependency audit found zero vulnerabilities.
The full suite includes the business-name default change. An initial run overlapped
relocation of the one-off diagnostic and failed to find that file; the complete
suite was rerun successfully after packaging stabilized.

Final results are recorded in the local release manifest and validation logs under
`artifacts/sales-readiness/2026-11-16/release-candidate/` in the parent workspace.
Final validation uses a clean process environment without QA database or payment
credentials. Opt-in provider/database tests remain skipped in ordinary CI.

Previously completed isolated sandbox evidence covers stand, Multi-Link and Reviews
payments, webhook/entitlement handling, account activation, cancellation, logo/proof
approval and simulated fulfillment. These are layered tests, not a claim that every
operation ran in one uninterrupted browser journey. Both manual logo paths passed.
Four rendered provider test emails were marked delivered to the approved inbox.

The one-off captured-event cleanup script is retained outside the release source.
Optional provider harnesses are operator tools requiring dedicated QA credentials,
explicit enablement and the documented local evidence directory; they are not
portable CI or production commands. Credentials, fixture state, capability URLs,
dependencies and generated build directories are excluded from the source archive.

## Read-only production verification

On November 16, the existing Worker `tap-rater-app-git` served 100% of traffic from
version `deaad729-4411-492b-b058-e7ad30449597` (1122), deployment
`040e84ad-e17c-482a-ab49-4ecca36148da`. Its public build identifier was
`qbJ79cM9AQ9ksmMT-iI1N`. This is a recorded rollback target, not a deployment of
this candidate. No matching source commit annotation was found.

Required database, Stripe, Resend, Google and session secret names are present;
their values were not retrieved and presence does not establish validity. Existing
marketing checkout and hosted purchasing flags are enabled, with test entitlements
disabled. Google publishing is already globally enabled, but the Reviews
imports-and-drafts package separately rejects publication. This candidate does not
change those controls.

Fresh public spot checks of Google Review, customer-feedback and menu/order product
pages returned $49 and the expected optional $9.99/month Multi-Link service. Public
shop inventory showed 60 products. This is not full reconciliation against private
catalog/Stripe records; the 74-record fallback inventory is a different data source.

## Remaining release conditions

- Explicit deployment approval remains required. Use the tested candidate and the
  existing manual deployment procedure; do not enable automatic builds or alter
  live billing. Retain the recorded active version as the rollback reference.
- Runtime email API authentication and inbox placement remain unverified by the
  provider UI test sends. Existing production secret presence is verified only.
- Full live catalog/specification/variant and private billing reconciliation remains
  unverified. Public spot checks found no mismatch; no catalog changes are proposed.
- Real manufacturing, shipping, NFC programming/tapping and Google publication are
  outside the verified sandbox scope. These limits do not imply current sales must
  stop or that existing fulfillment is broken.

No additional verified application defect emerged from the final source review.
Do not claim complete production end-to-end certification from this evidence.
