# Tap Rater Project Completion Status

Last verified: September 5, 2026 (America/New_York)

This is the current completion ledger. `docs/launch-checklist.md` remains the detailed QA reference, but its original unchecked boxes are not an accurate record of work already proven.

## Current State

The September 5 ecommerce audit supersedes the historical percentages below: approximately **88% implemented / 72% launch-ready** at audit baseline. **Commerce correction Phases 1-3 are complete in test mode**, with Phase 3 scoped to the existing made-to-order model. Payment/refund reliability, durable recovery, catalog price authority, availability enforcement, and a dedicated production/shipment/support/refund drill were verified. Three correction phases remain. Owner inbox, physical fulfillment, and operating-policy acceptance remain open; live launch is not approved. No new overall readiness percentage has been calculated. See `docs/ecommerce-phase-1.md`, `docs/ecommerce-phase-2.md`, `docs/ecommerce-phase-3.md`, and `artifacts/ecommerce-readiness-2026-09-05/audit.md`. These are not the earlier six UI/UX phases.

- Configuration readiness: 88%
- Blocked configuration checks: 0
- Manual confirmations: 3
- Stripe runtime: test mode
- Production application: `tap-rater-app-git` on `taprater.com`
- Deployed Phase 1 release: `206d8d6f-14a3-492e-ac9c-c0140deba84f`; 701 tests passing across 111 files, plus 5 explicitly run isolated-database integration tests.
- Previous Phase 2 release: `5cf96db6-18ca-4bb8-85aa-483d9b8bab0e`; 729 tests and 8 explicitly run isolated-database tests passed. Deployed recovery, replay, and a fresh first-pass checkout/invoice/email test passed. Dedicated QA orders were fully refunded; concurrent refund notification retries reconciled to 200.
- Current Phase 3 release: `f7c4fd2c-9b4a-40f5-a9e3-55fd9038a614`; 747 tests and 9 explicitly run isolated-database tests passed. Price round-trip, stale-cart rejection, production/shipment guards, support resolution, and a fully refunded $53.34 Stripe test order are recorded in `docs/ecommerce-phase-3.md`. Public catalog prices remain unchanged; Multi-Link stays fixed at $9.99/month.
- Cloudflare Workers Paid is active at the owner-approved $5/month plus usage. The deployed Worker explicitly allows 30,000 ms CPU and 1,000 subrequests per invocation. Stripe remains in test mode.
- Active application database verified from a new deployed checkout: Neon `milestone7-qa` (`br-restless-shape-at38e1nu`), not the separately named `production` branch. Recovery checkpoint retained; branch protection and restore acceptance remain open.

## Commerce Corrections

| Phase | Status | Completion evidence still required |
| --- | --- | --- |
| 1. Payment reliability | Complete in test mode | Live equivalents belong to Phase 6 |
| 2. Account, invoice, email recovery | Complete in test mode | Owner inbox/account acceptance belongs to Phase 5; live equivalents to Phase 6. See `docs/ecommerce-phase-2.md` |
| 3. Store operating controls | Complete in test mode (made to order) | Owner operating-policy and physical fulfillment acceptance belong to Phase 5; finite stock is not implemented. See `docs/ecommerce-phase-3.md` |
| 4. Security and recovery | Open | Token isolation, branch protection, backup/restore coverage |
| 5. Owner acceptance | Open | Accounts, portals, inbox, operations, restore drill |
| 6. Real-money launch | Open | Tax/policy decision, live configuration, controlled real purchases and reconciliation |

## Phase Progress

The following historical estimates predate the ecommerce failure-path audit and must not be used as current launch-readiness scores. Tax/legal approval and live payment proof remain separate launch gates.

| Phase | Complete | Remaining work |
| --- | ---: | --- |
| Product catalog, inventory, and storefront | 97% | Final cross-device regression and an owner-observed inventory toggle drill |
| Checkout, orders, and Stripe test payments | 94% | Live-mode cutover and four controlled real purchases with the owner present |
| Customer accounts, billing, and Multi-Link | 94% | Owner activation of the Stripe-backed QA account and both Billing Portal checks |
| Admin operations and fulfillment | 96% | One owner-observed test-mode operations drill before live launch |
| Transactional email operations | 94% | Owner configuration of the signed Resend webhook and controlled launch-mailbox verification |
| Security, accessibility, performance, and recovery | 96% | Owner-observed restore/rollback drill and a customer-uploaded media backup policy |
| Tax and legal readiness | 55% | Written accountant/legal operating decision |
| Live launch validation | 65% | Live credentials, live webhook proof, four real transactions, and reconciliation |

## Completed And Proven

- Stripe test checkout works for direct, branded, direct plus Multi-Link, and branded plus Multi-Link purchases.
- Quantity checkout, shipping threshold, Virginia manual tax, paid-order persistence, invoices, invoice items, and subscriptions are proven in Stripe test mode.
- Stripe webhook destination, required event selection, Billing Portal configuration, and Stripe customer email settings were confirmed in the Stripe Dashboard.
- Customers can access orders, invoice links, hosted pages, and the correct Stripe billing profile for each subscription.
- Authenticated checkout securely reuses an existing same-mode Stripe customer profile without trusting email alone.
- Pending or disabled customers cannot use signed account sessions, saved Stripe details, or protected account APIs.
- Admin can disable and reactivate eligible customer accounts from the customer directory.
- Admin can securely resend a pending customer's activation email with token rotation, cooldown protection, and failure rollback.
- Admin can inspect provider acceptance and delivery outcomes for transactional email, filter failures, and retry regenerable order or shipping messages.
- Transactional email sends use idempotency keys; order and shipping keys are stable hashes that do not expose source identifiers.
- The email delivery ledger remains metadata-only. Phase 2 adds a separate encrypted pending-message outbox and encrypted reusable activation credentials; see its key-custody runbook before live launch.
- Product quantity, shipping, tax, production, fulfillment, refund, catalog, CMS, customer, and hosted-page backend surfaces are deployed.
- Payment-hold and post-shipment guards prevent invalid production or fulfillment actions at both the admin UI and API layers.
- First-shipment transitions preserve the original shipped timestamp and attempt one tracked shipping notification without rolling back saved state when email delivery fails.
- Admin inventory controls update storefront availability directly, and server-side checkout rejects out-of-stock products.
- Contact, setup, and link-change requests have a searchable staff queue with new, in-progress, and resolved states plus internal notes.
- Full-refund handling requires explicit confirmation, uses a stable Stripe idempotency key, and reports Stripe/local persistence split failures for reconciliation.
- Public forms, checkout creation, setup uploads, hosted-page submissions, and click events use Cloudflare-native per-client rate limits.
- Webhook bodies are bounded before signature processing, IP identifiers use keyed HMACs, and login rate limiting no longer has a public fallback secret.
- HTTP and `www` traffic is canonicalized by the Cloudflare Worker; private/action routes are no-indexed and public pages publish route-specific canonical URLs.
- Storefront image variants are generated deterministically at 160, 640, and 1200 pixels, reducing the generated image set to about 12.16 MB from about 93.13 MB of source imagery.
- Mobile Lighthouse scores are 96/100/100/100 on the homepage and 97/100/100/100 on the product page; desktop homepage scores are 100/100/100/100.
- The Neon production branch is protected, point-in-time history is seven days, daily snapshots are enabled, and a pre-hardening snapshot is retained through October 5, 2026.
- Recovery configuration has an automated 36-check gate and a documented Neon, Cloudflare, and R2 runbook.

## Owner At Computer Queue

Do not perform these unattended. They require owner identity, an SMS code, a legal/business decision, or observation of a real financial transaction.

### 1. Stripe phone verification

1. Open the Stripe Dashboard for the Tap Rater account.
2. Complete the phone-number prompt with the owner's phone.
3. Enter the SMS verification code.
4. Confirm the verification warning is gone and customer card-management actions are available.

Completion evidence: Stripe no longer requests phone verification for payment or customer-card operations.

### 2. Activate the Stripe-backed QA customer

1. From Tap Rater Admin, open Customers.
2. Use Resend activation for the pending QA customer if the existing link has expired.
3. Open the activation email, create a password, and log in.
4. Open `https://taprater.com/account/orders`.
5. Use Manage billing on each of the two Stripe-backed subscriptions.
6. Confirm each action opens the Stripe Billing Portal for the expected subscription profile.

Completion evidence: the account is active and both subscription billing profiles open successfully without exposing another customer's data.

### 3. Configure and verify the Resend delivery webhook

1. Open Resend Dashboard and create a webhook for `https://taprater.com/api/webhooks/resend`.
2. Select `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.failed`, `email.bounced`, `email.complained`, and `email.suppressed`.
3. Copy the webhook signing secret into the Cloudflare Worker secret named `RESEND_WEBHOOK_SECRET`.
4. Send one controlled test only to a mailbox owned by Tap Rater.
5. Open `/admin/settings/emails` and confirm the attempt changes from Accepted to Delivered.

Completion evidence: the launch-readiness check is Ready and the controlled message has a Delivered event in Tap Rater Admin.

### 4. Run the controlled admin operations drill

Use dedicated Stripe test data and owner-controlled email addresses only:

1. Open one paid test order and move it through ready for production, in production, completed, ready to ship, shipped, and delivered.
2. Add test tracking before shipment and confirm the shipping attempt appears in `/admin/settings/emails`.
3. Toggle one designated QA product out of stock, verify checkout rejects it, and immediately restore it to in stock.
4. Move one designated QA request from New to In progress to Resolved, verify its internal note, and restore it if the request is not disposable test data.
5. Create a dedicated paid Stripe test order, issue its full refund in Tap Rater Admin, and reconcile the refund ID and state with Stripe test mode.
6. For any Multi-Link order, separately verify that refunding the charge does not cancel its subscription.

Completion evidence: the order lifecycle, shipping email attempt, inventory gate, support queue, and refund all reconcile between the admin UI, Stripe test mode, and the production database.

Detailed procedure: `docs/admin-operations-runbook.md`.

### 5. Tax and legal decision

Confirm with an accountant or qualified adviser:

- Virginia sales-tax registration and filing responsibility
- whether each physical stand, shipping charge, and Multi-Link subscription is taxable
- whether the current manual 6% rule is correct for every destination being accepted
- whether Stripe Tax should replace the manual rule and who will handle registration and remittance

Completion evidence: a written operating decision identifies jurisdictions, taxable items, filing owner, and whether manual tax or Stripe Tax is authorized.

### 6. Live Stripe launch and real purchases

Perform only while the owner is present and after the tax decision:

1. Confirm Stripe business, bank, identity, phone, webhook, Billing Portal, receipt, refund, and subscription settings.
2. Change the Worker atomically from test to live mode with matching live publishable key, secret key, and live webhook signing secret.
3. Run one controlled real purchase for each case: direct, branded, direct plus Multi-Link, and branded plus Multi-Link.
4. Verify payment, order, invoice, invoice item, email, hosted page, subscription, refund/fulfillment controls, and bank payout behavior.
5. Reverse or fulfill the controlled orders according to the launch test plan.

Completion evidence: all four live cases reconcile between Stripe, Tap Rater Admin, the customer account, email delivery, and the production database.

### 7. Run the recovery drill and choose the media backup policy

Perform this with the owner present before live launch:

1. Restore the latest Neon snapshot to a temporary branch and run the read-only validation checklist.
2. Roll the application Worker back to an identified known-good version, smoke test it, and roll forward to the release version.
3. Rebuild one static image variant and republish one disposable hosted-page snapshot.
4. Choose and test a separate backup/export process for customer-uploaded product media in R2.
5. Record restore timing, rollback timing, the recovery point objective, and the recovery time objective.

Completion evidence: temporary-branch restore, Worker rollback/roll-forward, hosted snapshot recovery, and disposable product-media restore are all observed and documented.

Detailed procedure: `docs/recovery-runbook.md`.

## Autonomous Work Queue

The ecommerce audit reopened engineering work. Phases 1 and 2 release verification are complete in test mode. The approved Workers Paid upgrade, explicit runtime limits, and a fresh first-pass checkout closed Phase 2's capacity acceptance gate. Phase 3 pricing and operating controls and Phase 4 token isolation and deployment/recovery work remain. Owner acceptance and the live launch are Phases 5 and 6. Keep the owner-at-computer queue above until each item has direct completion evidence.

## Safety Rules

- Keep Stripe in test mode until the owner-at-computer launch session.
- Do not enable Stripe Tax before the tax/legal decision.
- Never print or commit secret values, customer passwords, activation tokens, card data, or webhook secrets.
- Do not alter real customer access, subscriptions, payments, refunds, or fulfillment records during unattended QA.
