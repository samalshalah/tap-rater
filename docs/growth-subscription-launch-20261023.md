# Growth subscription rollout

Status: deployed to production on October 23, 2026 with owner approval. Monthly checkout is enabled. Application commit: `0e1a7a1`; Cloudflare version: `e0202c70-6479-44bd-a2bd-628d3d22b852`. The entitlement/spam and subscription migrations were applied to the runtime database branch `br-restless-shape-at38e1nu` (historically named milestone7-qa), not the unused branch named production. Paid ranking scans remain paused.

## Offer

$29 per location per month only. No annual option. Stand purchases remain one-time charges. Growth can be bought separately at /growth or added to a stand checkout after customer sign-in. Multi-Link subscriptions must be purchased separately.

Per subscribed location: 300 AI review reply generations, 10 GBP improvement generations, three keywords and four monthly ranking updates on up to a 7x7 grid (588 points). AI regenerations/failed attempts consume allowance. Usage resets on the New York calendar month. No automatic overage charges. Replies and profile changes remain drafts; directory distribution is excluded.

## Payment and access

The server fixes prices, validates monthly cadence, requires renewal consent and binds each purchase attempt to the authenticated customer. A database lease and Stripe idempotency prevent duplicate sessions. An open checkout is reserved for one hour; repeat requests resume it, and conflicting requests are rejected. Expired/failed checkout events release the reservation. Access is granted from verified webhooks after retrieving the current subscription and paid latest invoice, never from the success redirect. Cancellation at period end preserves paid access until expiry. Immediate cancellation/payment failure disables access. Existing content is preserved.

The customer billing portal supports invoices, payment methods and cancellation at period end. Plan/quantity changes are disabled in the portal for this release. Support must coordinate refunds/disputes with cancellation; automatic subscription revocation on refunds/disputes is not implemented.

## Release prerequisites

1. Completed: prerequisite package access and competitor schemas verified; 2026-10-23-marketing-entitlements-spam.sql and 2026-10-23-marketing-subscriptions.sql applied to the runtime production database. Ranking provider verified disabled after deployment.
2. Completed: live default Stripe portal verified with invoice history, payment method updates and period-end cancellation; plan/quantity changes disabled. MARKETING_PORTAL_CONFIGURATION_ID=default omits the configuration argument and uses that verified default. Sandbox configuration IDs cannot be used live.
3. Confirm the production signed webhook receives checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, invoice.paid, invoice.payment_failed, customer.subscription.created, customer.subscription.updated and customer.subscription.deleted. Keep existing commerce events enabled.
4. Set MARKETING_CHECKOUT_ENABLED=true only after production release approval and live payment configuration verification. Never set MARKETING_TEST_ENTITLEMENTS=true against production. Existing store tax configuration needs review for the new digital subscription; Stripe Tax was not enabled by this implementation.
5. Verify account activation email delivery and a full hosted checkout return through the deployed webhook before retail launch. Sandbox tests exercised Stripe API checkout creation and the application lifecycle handler, not delivery to the deployed webhook. Ranking schedules remain paused until separately approved; no paid scans were run.

## Verification

Production webpack build passed before the monthly-only correction; subsequent TypeScript and targeted tests cover that correction. 71 checkout/subscription tests passed after removing annual billing, including a real isolated Stripe sandbox lifecycle test: monthly standalone and stand bundle totals, duplicate protection, portal session creation, paid activation, two-location ceiling, separate 300/10 AI allowances and cancellation. The local purchase page was inspected in Chrome and confirmed monthly-only. Earlier commerce and access regression suites passed; known unrelated baseline suite failures are documented in marketing-access-launch-20261023.md.

## Production verification

- 123 targeted tests passed; final webpack build, TypeScript checking and OpenNext packaging passed. The isolated sandbox lifecycle test passed again after explicitly specifying Stripe's current `hosted_page` mode.
- Live checkout initially rejected the old `hosted` mode. Corrected the request and regression test, redeployed, and verified the hosted Stripe page displays $29.00 per month for one location with the correct allowances. A fresh checkout attempt avoided reusing the failed request's Stripe idempotency key.
- Standalone and mixed stand/subscription totals, paid activation, limits, portal creation and cancellation were verified in the sandbox. The live test stopped before entering payment details or subscribing. A pending checkout exists, but no live subscription or charge was created.
- Live webhook destination `we_1U4fx8JfXGmPO60V40lmMASQ` is active with 13 events after adding customer.subscription.created; existing commerce events preserved. New live paid-webhook delivery and new-account activation-email delivery remain unverified.
- Public growth, pricing, shop and checkout pages returned 200; unauthenticated subscription API returned 401; invalid webhook signature returned 400.
- GOOGLE_REVIEWS_PUBLISHING_ENABLED=false, MARKETING_TEST_ENTITLEMENTS=false, STRIPE_MODE=live. No Google data published and no paid scans run.
- Release built from the local buying-experience checkout into artifacts/google-production-20261022/release and manually deployed with --keep-vars under explicit owner authorization. These commits must be included in the normal Git deployment source before its next rollout.
- Checkout proof: artifacts/growth-subscription/live-stripe-monthly-checkout.png. Previous worker version before this release: b8893839-ed76-4746-996e-336918cd800a.
