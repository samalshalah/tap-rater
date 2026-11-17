# Release follow-up: catalog, email evidence and shared login

This local follow-up extends the selected checkout-tracking release candidate.
No production catalog edits, customer orders, billing changes, push or deployment
were performed. One approved synthetic test email was sent through the deployed app
to orders@taprater.com; only its normal delivery audit record was created.

## Local changes

- Use `/account/login` for customers and administrators on desktop and mobile.
  Remove the separate admin form; legacy `/admin/login` redirects to the shared
  page. Admin guards and logout links use the shared route. Existing authentication
  APIs, cookie separation, credential checks and rate limits remain intact.
- Remove existing redirect-only product aliases from public catalog listings.
  Book Appointment and View Menu URLs continue to redirect to their canonical
  Contact and Menu products. Direct product lookup, checkout catalog reads and
  historical order records are preserved. No product or price was edited live.
- Update synthetic email samples and the admin preview from the retired $39
  Standard option to the current $49 custom QR/NFC stand. Label sample messages
  clearly as test-only with no purchase and no fulfillment. Real customer order
  rendering and live template settings are unchanged.

## Catalog verification

Read all 60 public product URLs, resolving to 58 canonical products. Public models,
schema prices, setup prices and the candidate's local cart/Stripe line builders
agree at $49 one-time. Seven canonical products offer an explicitly selected
$9.99/month Multi-Link add-on; direct purchases remain nonrecurring. Runtime
promotions are disabled and effective US shipping is free. No size/color premium
options were exposed in the observed catalog.

Read-only snapshots of the branch named `tap-rater-production-20261104` contain
60 products and 120 options. All 58 canonical public models agree with the snapshot
on prices, active option, normalized variants, published specifications, included
items, descriptions and relevant customization/service flags. Authenticated runtime
diagnostics confirmed its database host maps to that branch. All 58 canonical SKUs
also match the active database.
Published specification consistency does not independently verify manufacturing
materials, NFC chip type or physical dimensions.

## Email verification

Existing paid live-order confirmations and a linked paid-account activation have
matching delivered ledger/provider records. The November 13 order's Resend API
log shows HTTP 200 for POST /emails using the `tap-rater-git-worker` key and the
Node.js SDK. A November 16 notification also has matching ledger/provider delivery
and HTTP 200 using that key. No secret values or customer message bodies were saved
in the shareable evidence.

The current deployed app then sent one labeled synthetic order-template email to
the previously approved orders@taprater.com inbox. Resend and the live delivery
ledger confirmed delivery on November 16 at 21:35:52 UTC. This verifies current
runtime sending authentication and the delivery callback. Read-only preview used
its fallback renderer, so API retrieval permission is not established; it is not
needed to prove sending. The owner confirmed the test arrived in the Inbox. Gmail and Stripe
connectors requested reauthentication; alternate authenticated evidence was used.

## Evidence and remaining gates

Final validation passed: 2,512 tests (35 opt-in skipped), Cloudflare/Next production
build including TypeScript, deployment dry run, and local desktop/mobile HTTP
checks of the shared sign-in page, legacy redirect and protected admin API.

Sanitized reports, per-product reconciliation and final validation are under the
parent workspace's `artifacts/sales-readiness/2026-11-16/release-candidate/live-gates/`.
Remaining checks: physical operational claims. Deployment still requires owner
approval. The shared live `/account/login` already supports admin credentials;
the local redirect/copy changes await that separately approved deployment.
