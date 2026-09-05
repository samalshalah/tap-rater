# Ecommerce Correction Phase 1: Payment Reliability

Date: September 5, 2026.

## Status

**Phase 1 complete in Stripe test mode:** engineering, database migration, deployment, and the dedicated payment/refund/replay release checks passed on September 5. These are the commerce correction phases, not the previous six UI/UX phases. This does not close the other five phases or authorize real-money launch.

Deployed to the public application while preserving Stripe test mode. Added four refund events to the existing test destination. A dedicated test payment and full test refund were completed; its customer/admin email attempts were accepted by the provider. No real charge/refund, database URL change, live secret rotation, or live subscription change was made.

## Implemented

- Durable database leases serialize processing by payment or subscription, with ownership checks and expiry after a crashed worker. Failed work remains retryable.
- Lifecycle and provisioning receipts are written after work succeeds. Versioned receipts allow repair of events recorded prematurely by the old implementation.
- Checkout provisioning deduplicates by Checkout Session, not merely event ID. Partial retries reuse deterministic business identities and existing hosted pages without resetting production progress or overwriting published customer content.
- Lifecycle events retrieve current Stripe subscription state inside the lease. Delayed invoices cannot override a newer cancellation; retries do not restart the grace period. Snapshot publication failures remain retryable.
- Paid-order writes use conditional updates, fail closed on lookup errors, preserve refund states, and cannot blindly overwrite a concurrent refund.
- Refund creation is distinct from completion. Pending, requires-action, succeeded, partial, failed, and canceled refund states are reconciled from Stripe's current refund list. Retries check existing Stripe refunds before requesting another.
- Added signed handlers for `refund.created`, `refund.updated`, `refund.failed`, and `charge.refunded`.
- Subscription Checkout payments are linked through Invoice Payments. An early refund can locate the initial subscription checkout; renewal-invoice refunds are not mistaken for stand-order refunds.
- Admin/customer order labels show refund state. Production and shipping remain locked for refund holds, and the admin cannot accidentally submit the same refund again from the normal UI.

Refunding a stand charge does not cancel its subscription. Partial/failed refund follow-up is deliberately a staff review workflow, not an automatic second reimbursement.

## Verification

- `npm test`: 701 tests passed across 111 files. Five real-database integration tests are skipped by default to avoid accidental writes.
- Explicit isolated-branch integration run: all 5 tests passed. Includes concurrent paid-order saves, refund replay protection, processing leases/retries, and completion receipts.
- `npx tsc --noEmit`: passed.
- `npm run cf:build`: passed; image generation verified 1,017 variants. OpenNext reports its existing Windows-support warning.
- Browser checks: pending and failed refund details at desktop and 390px mobile, no document overflow, no duplicate refund button, and disabled production/shipping controls. The existing local development CSP blocks React's development-only `eval`; this is not a production payment failure.
- Stripe signature tests use the installed SDK to generate and verify signatures, including rejection of an incorrect signing secret. External payment/refund calls are mocked in unit tests; these tests are not real Stripe refund delivery proof.

## Database Migration

Migration: `supabase/2026-09-05-payment-reliability.sql`.

Adds `stripe_processing_locks`, refund summary fields on `orders`, and an index on `stripe_payment_intent_id`. Existing order contents are not rewritten.

Applied twice successfully to isolated Neon validation branch:

- Project: `winter-grass-30947546`
- Branch: `br-tiny-truth-atyl121r` (`ecommerce-phase1-payment-reliability`)
- Parent: `br-restless-shape-at38e1nu` (`milestone7-qa`)
- Compute: `ep-holy-bonus-atnws6yy`
- Database: `neondb`

The validation branch contains synthetic test fixtures and has five-minute automatic compute suspension. Integration tests require an explicit branch hostname, connection string, and write-opt-in, and reject the current application database hostname.

The deployed site's database was independently mapped by creating a unique unpaid checkout through `taprater.com` and finding that exact session in `milestone7-qa`; it was absent from the separately named `production` branch. The additive migration was then applied to the confirmed active branch `br-restless-shape-at38e1nu`. No database credentials or target were changed. The separately named production branch remains untouched.

Neon rejected a pre-migration snapshot because the active branch is a child branch. A **post-migration, pre-Worker-release** checkpoint branch was created and verified ready: `br-calm-shape-at56xf6e`, named `before-ecommerce-phase1-worker-release-20260905`, with no compute, parent timestamp `2026-09-05T18:02:28Z`. This is not a pre-migration snapshot or a completed restore drill. The migration is additive and compatible with the previous Worker.

## Stripe Dashboard Findings

Confirmed through the owner's signed-in Chrome, in Tap Rater account `acct_1U1TpKJfXGmPO60V`:

- Test endpoint `we_1U48gdJfXGmPO60VSdo9bjJf` is active at `https://taprater.com/api/webhooks/stripe`.
- The test endpoint now subscribes to **12 events**: checkout completed, async succeeded/failed, expired, invoice paid/payment-failed, subscription updated/deleted, `refund.created`, `refund.updated`, `refund.failed`, and `charge.refunded`. The original eight events, endpoint URL, API version `2026-07-29.dahlia`, and signing secret were preserved.
- The live destination was not changed; its four refund subscriptions remain part of Phase 6 cutover.
- Historical failed deliveries were not replayed. The dedicated new test's delivery evidence is below.
- Live endpoint `we_1U4fx8JfXGmPO60V40lmMASQ` shows four failed attempts for an expired live session, with HTTP 400 signature-verification errors. The deployed Worker is configured for test mode. Do not rotate to a live secret or enable real payments as a shortcut.
- No webhook signing secrets were revealed or copied. Only the dedicated new test checkout event was manually resent.

## Completed Release Checks

1. Active database verified by deployed-site persistence, not inferred from local environment values.
2. Additive migration applied to that database; recovery checkpoint retained. Prior Worker rollback version: `101d24ab-d6ce-4b34-8496-30f363fb537d`.
3. `npx wrangler deploy --dry-run --keep-vars` and `npx opennextjs-cloudflare deploy --keep-vars` passed. Released Worker version: **`206d8d6f-14a3-492e-ac9c-c0140deba84f`**. Stripe remains `test`; secrets and bindings preserved.
4. Existing Stripe test destination updated to 12 subscriptions and verified after saving.
5. Browser purchase, authenticated admin refund, automatic refund-event delivery, manual checkout replay, and repeated admin refund request verified below.
6. Eight deployed public/authenticated page smoke checks returned HTTP 200 without application-error markup. An unauthenticated refund request returned HTTP 401. The refunded admin detail shows the refund label and fulfillment hold and omits the refund action.

## Deployed Test Evidence

Dedicated order: `615c3168-c81c-44b1-b249-c0b30028e332`, marked **Phase 1 Release QA - Do Not Fulfill**. Synthetic shipping details and the owner's previously supplied QA mailbox were used. Stripe test card only; Link/payment-detail saving disabled.

| Evidence | Result |
| --- | --- |
| Checkout | `cs_test_b11qorE9rzbn7EUyaLrAL4MVyUv33bV9RYWkRcvNCpa8tdX7Kz2DO7YohO` |
| Payment | `pi_3UCO0JJfXGmPO60V0JWU5n6i`, 5,334 cents paid |
| Invoice | `in_1UCO0LJfXGmPO60VBaakyOcl`; one stored invoice/item, invoice URL and PDF present |
| Admin refund | HTTP 200, `re_3UCO0JJfXGmPO60V0TYSpzFr`, `succeeded` |
| Refund delivery | `refund.created` and `refund.updated`: HTTP 200 |
| Charge refund delivery | `evt_3UCO0JJfXGmPO60V0EpPGVBn`: initial HTTP 500 at 14:08:45 EDT, automatic recovery to HTTP 200 at 14:09:02 |
| Checkout replay | `evt_1UCO0PJfXGmPO60V9hk24aXE`: manual resend after refund, HTTP 200 at 14:10:21 EDT |
| State after replay | `canceled/refunded`, `refund_status=succeeded`, 5,334 cents refunded, zero pending |
| Duplicate protection | One order, one invoice, one invoice item; two original email attempts, no additional attempts after replay |
| Admin refund retry | HTTP 200, `alreadyRefunded=true`, same refund ID, no second reimbursement |
| Processing lease | Released; six successful claims through payment/refund/replay processing, no final error |

The initial charge-event error response was `Refund status could not be synchronized.` Its underlying cause was not captured from Worker logs; do not claim a specific cause. Stripe's automatic retry recovered, and persisted state was correct. The `refund.failed` subscription is configured; pending/failed/canceled refund behavior is covered by automated tests, not a newly induced Stripe failure in this release drill.

Email evidence is provider acceptance, **not inbox delivery proof**. Invoice/account/email recovery remains Phase 2. No physical fulfillment or subscription was created by this dedicated direct-stand test.

The separate database-mapping probe, unpaid order `487b5cce-53d5-4a8d-8d08-4dc42eebefa4`, remains unpaid. Its API-created checkout was not portable into another browser, as expected from client session protection; the paid proof was created through the normal storefront instead.

Machine-readable evidence and guarded reproduction scripts are under `artifacts/ecommerce-phase-1/`: `release-checkout.json`, `release-verification.json`, `create-release-checkout.mjs`, and `verify-release.mjs`. They contain no credentials or client secrets. Do not rerun write-enabled scripts against unrelated orders.

Repeat appropriate live configuration and reconciliation only during the separately authorized Phase 6 cutover. Phase 1 is deployed and test-verified; the ecommerce system is **not yet cleared for real sales**.

## Remaining Phases

2. Durable account, invoice, and email recovery. Existing warning-only invoice/account/email paths remain outside this change.
3. Store operating controls, pricing authority, inventory policy, and fulfillment acceptance.
4. Security and recovery, including verified deployment/database mapping and backup coverage.
5. Owner-observed account, portal, inbox, operations, and restore acceptance.
6. Tax/policy approval and controlled real-money launch.

References: [Stripe webhooks](https://docs.stripe.com/webhooks), [Stripe refund object](https://docs.stripe.com/api/refunds/object), [Stripe subscription object](https://docs.stripe.com/api/subscriptions/object).
