# Tap Rater Project Completion Status

Last verified: September 4, 2026 (America/New_York)

This is the current completion ledger. `docs/launch-checklist.md` remains the detailed QA reference, but its original unchecked boxes are not an accurate record of work already proven.

## Current State

- Configuration readiness: 91%
- Blocked configuration checks: 0
- Manual confirmations: 2
- Stripe runtime: test mode
- Production application: `tap-rater-app-git` on `taprater.com`
- Automated verification: 83 test files and 487 tests passing in the current release candidate

## Phase Progress

These are engineering estimates based on implemented behavior and verification evidence. Tax/legal approval and live payment proof remain separate launch gates.

| Phase | Complete | Remaining work |
| --- | ---: | --- |
| Product catalog, inventory, and storefront | 96% | Final cross-device regression and an inventory operations drill |
| Checkout, orders, and Stripe test payments | 94% | Live-mode cutover and four controlled real purchases with the owner present |
| Customer accounts, billing, and Multi-Link | 94% | Owner activation of the Stripe-backed QA account and both Billing Portal checks |
| Admin operations and fulfillment | 90% | End-to-end fulfillment, refund, inventory, and support drills |
| Transactional email operations | 82% | Delivery visibility, retry controls, and launch mailbox verification |
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
- Product quantity, shipping, tax, production, fulfillment, refund, catalog, CMS, customer, and hosted-page backend surfaces are deployed.

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

### 3. Tax and legal decision

Confirm with an accountant or qualified adviser:

- Virginia sales-tax registration and filing responsibility
- whether each physical stand, shipping charge, and Multi-Link subscription is taxable
- whether the current manual 6% rule is correct for every destination being accepted
- whether Stripe Tax should replace the manual rule and who will handle registration and remittance

Completion evidence: a written operating decision identifies jurisdictions, taxable items, filing owner, and whether manual tax or Stripe Tax is authorized.

### 4. Live Stripe launch and real purchases

Perform only while the owner is present and after the tax decision:

1. Confirm Stripe business, bank, identity, phone, webhook, Billing Portal, receipt, refund, and subscription settings.
2. Change the Worker atomically from test to live mode with matching live publishable key, secret key, and live webhook signing secret.
3. Run one controlled real purchase for each case: direct, branded, direct plus Multi-Link, and branded plus Multi-Link.
4. Verify payment, order, invoice, invoice item, email, hosted page, subscription, refund/fulfillment controls, and bank payout behavior.
5. Reverse or fulfill the controlled orders according to the launch test plan.

Completion evidence: all four live cases reconcile between Stripe, Tap Rater Admin, the customer account, email delivery, and the production database.

## Autonomous Work Queue

1. Transactional email delivery visibility and retry-safe operations.
2. Production operations QA for fulfillment, refunds, inventory, and customer support.
3. Security, accessibility, SEO, performance, backup, and rollback verification.

## Safety Rules

- Keep Stripe in test mode until the owner-at-computer launch session.
- Do not enable Stripe Tax before the tax/legal decision.
- Never print or commit secret values, customer passwords, activation tokens, card data, or webhook secrets.
- Do not alter real customer access, subscriptions, payments, refunds, or fulfillment records during unattended QA.
