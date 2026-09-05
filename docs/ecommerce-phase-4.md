# Commerce Phase 4: Security And Recovery

September 5, 2026. **Phase 4 complete:** engineering changes deployed and tested, with owner-controlled portable encryption-key custody and retrieval accepted. Stripe remains in test mode; this is not live-launch approval.

## Deployed

Application version: `d33d12e1-bf61-4927-a338-9012a39771df`. Initial Phase 4 backup/drill version: `7a7ddd92-c042-4202-b41b-9b1bc27fe600`.

- Versioned HMAC-bound admin-session, customer-session, and customer-login purposes reject cross-purpose tokens, legacy tokens, invalid signatures/timestamps, wrong admin identities, and missing/shared customer secrets. Existing users must sign in again; old magic links must be requested again. Opaque activation/password-reset credentials are unchanged.
- Readiness checks now flag missing or reused customer signing secrets. Production diagnostics verified the existing customer/admin secrets differ, without revealing values.
- Confirmed the deployed database maps to `milestone7-qa`, protected that exact branch, and verified seven-day continuous PITR. Neon rejected native snapshots/schedules on this child branch. The separately named production branch's snapshots are not claimed as active-store coverage.
- Restored a retained time point into `br-lucky-dream-atl7pz5h`, with small autosuspending compute. Schema and full-row aggregate fingerprints match for orders, products, invoices/items, customers, and subscriptions. Source data and deployment connection were unchanged.
- Private daily media copies have 30-day retention, resumable 50-object batches every 15 minutes, concurrency leases, visible failure state, and idempotent retries.
- Admin-only recovery actions support status, backup, a disposable-image drill, and restore-to-new-key. No action overwrites an existing customer media key. Initial complete copy: 103 objects / 25,908,194 bytes. The production restore drill passed byte and metadata checks after deleting its own source canary.
- Local DPAPI recovery-key backup decrypts and has the expected format. The owner saved the same key in Bitwarden and completed independent phone retrieval with a successful local exact-match check.

## Verification

- 770 tests passed across 118 files. The standard suite skips the nine DB tests; they were separately run and all nine passed.
- 23 new tests cover token isolation/edge cases, local R2 operations through Miniflare, pagination, failure/retry, completion-checkpoint failure, daily version preservation, restore safety, and route authentication.
- TypeScript, Next/OpenNext production build, Cloudflare dry run, and deployed smoke checks passed. Recovery configuration gate: 40 checks.
- Production accepted fresh admin login; correctly signed legacy, customer-purpose, and wrong-admin-identity cookies returned 401. Unauthorized recovery reads/writes returned 401.
- Deployed diagnostics confirmed distinct signing secrets, the actual DB hostname, and Stripe test mode. Homepage, product, cart, account login, and admin login returned 200.
- Backup r2.dev access is disabled, custom domains are absent, and `runs/` and `drills/` have enabled 30-day expiry. Cron is deployed; the initial full copy was manually invoked through the same batch implementation.

Evidence: `artifacts/ecommerce-phase-4/database-restore.json`, initial `deployed-1788638646222.json`, final `deployed-1788639010317.json`, and repeatable `verify-deployed.mjs`, all under `artifacts/ecommerce-phase-4`. Procedures and retention limitations: `docs/recovery-runbook.md`. Local isolated preview is restored at `http://127.0.0.1:3031` using `start-preview.mjs`, with a separate ephemeral customer signer.

## Key Custody Acceptance

Completed at `2026-09-05T21:31:07.7398545Z`. The owner saved `COMMERCE_RECOVERY_SECRET` in the Bitwarden Secure note `Tap Rater - Commerce recovery key`, confirmed opening it on their phone, and entered its value into the masked local verifier. The verifier recorded an exact match against the existing local DPAPI backup, and the owner confirmed MATCH VERIFIED in the conversation.

Evidence: `artifacts/ecommerce-phase-4/key-custody.json`. This contains only metadata, the match result, and the owner's independent-device attestation. The agent did not inspect the vault or independently observe the phone. No key value or hash is recorded in the receipt, and the deployed key was not rotated. This closes the remaining Phase 4 gate without claiming live-launch approval or a provider-independent disaster-recovery SLA.

The local helper and its actual-launcher regression tests are retained as `recovery-key-handoff.ps1` and `test-recovery-key-handoff.ps1` in the same artifact directory. Both tests passed under the hidden-window launcher after correcting its inherited PowerShell module-path issue. Their clipboard checks use dummy data and are not the custody acceptance evidence.

## Remaining Gates

1. Phase 5: owner-observed rollback/roll-forward, hosted snapshot republishing, inbox/activation/reset, customer portals, and operating-policy acceptance. Automated tests do not close these checks.
2. Phase 6: tax/policy approval, deliberate live configuration, controlled real-money purchases, and payment/order/invoice/subscription/payout reconciliation.

No real payment, refund, customer activation, shipment, tax change, active-database restore, or production rollback occurred. Provider-local backups and an isolated recovery test do not establish an end-to-end disaster-recovery SLA.
