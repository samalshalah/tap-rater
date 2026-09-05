# Tap Rater Project Completion Status

Last verified: September 4, 2026 (America/New_York)

This is the current completion ledger. `docs/launch-checklist.md` remains the detailed QA reference, but its original unchecked boxes are not an accurate record of work already proven.

## Current State

- Configuration readiness: 88%
- Blocked configuration checks: 0
- Manual confirmations: 3
- Stripe runtime: test mode
- Production application: `tap-rater-app-git` on `taprater.com`
- Automated verification: 94 test files and 552 tests passing in the current release candidate

## Phase Progress

These are engineering estimates based on implemented behavior and verification evidence. Tax/legal approval and live payment proof remain separate launch gates.

| Phase | Complete | Remaining work |
| --- | ---: | --- |
| Product catalog, inventory, and storefront | 97% | Final cross-device regression and an owner-observed inventory toggle drill |
| Checkout, orders, and Stripe test payments | 94% | Live-mode cutover and four controlled real purchases with the owner present |
| Customer accounts, billing, and Multi-Link | 94% | Owner activation of the Stripe-backed QA account and both Billing Portal checks |
| Admin operations and fulfillment | 96% | One owner-observed test-mode operations drill before live launch |
| Transactional email operations | 94% | Owner configuration of the signed Resend webhook and controlled launch-mailbox verification |
| Security, accessibility, performance, and recovery | 86% | Final audit plus backup, restore, and rollback exercises |
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
- Email delivery storage contains metadata only and deliberately excludes HTML bodies, passwords, activation tokens, and payment data.
- Product quantity, shipping, tax, production, fulfillment, refund, catalog, CMS, customer, and hosted-page backend surfaces are deployed.
- Payment-hold and post-shipment guards prevent invalid production or fulfillment actions at both the admin UI and API layers.
- First-shipment transitions preserve the original shipped timestamp and attempt one tracked shipping notification without rolling back saved state when email delivery fails.
- Admin inventory controls update storefront availability directly, and server-side checkout rejects out-of-stock products.
- Contact, setup, and link-change requests have a searchable staff queue with new, in-progress, and resolved states plus internal notes.
- Full-refund handling requires explicit confirmation, uses a stable Stripe idempotency key, and reports Stripe/local persistence split failures for reconciliation.

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

## Autonomous Work Queue

1. Security, accessibility, SEO, performance, backup, and rollback verification.

## Safety Rules

- Keep Stripe in test mode until the owner-at-computer launch session.
- Do not enable Stripe Tax before the tax/legal decision.
- Never print or commit secret values, customer passwords, activation tokens, card data, or webhook secrets.
- Do not alter real customer access, subscriptions, payments, refunds, or fulfillment records during unattended QA.
