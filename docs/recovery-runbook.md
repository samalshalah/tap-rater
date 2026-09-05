# Tap Rater Recovery Runbook

Last verified: September 5, 2026 (America/New_York)

Use this runbook for service recovery only. Never paste credentials, connection strings, customer data, card data, or webhook secrets into tickets or command output.

## Current Safeguards

- Actual deployed database: project `winter-grass-30947546`, branch `br-restless-shape-at38e1nu` (`milestone7-qa`), database `neondb`. Its endpoint is `ep-silent-queen-at9qd228-pooler.c-9.us-east-1.aws.neon.tech`, independently confirmed through authenticated deployed diagnostics.
- That exact branch is now protected, with seven days (604800 seconds) of continuous point-in-time recovery history.
- Native snapshots/schedules are NOT supported on this child branch. The separately named `production` branch's daily snapshots do not protect the active store. Both snapshot and schedule requests were explicitly rejected by Neon. Do not silently switch to the older production database.
- Private R2 bucket `tap-rater-recovery-backups` retains daily media copies for 30 days. Public r2.dev access is disabled; no custom domains are attached.
- Initial complete media backup: 103 objects / 25,908,194 bytes at September 5, 20:04 UTC. A disposable deleted PNG was restored with matching SHA-256 and metadata. Existing customer media was untouched.
- Cloudflare retains Worker versions and deployments for rollback.
- Product media and hosted-page snapshots use separate R2 bindings.
- Application and hosted-page Workers have observability enabled.

## Neon recovery

Prefer restoring to a new branch. Validate the restored branch before changing production configuration.

1. In Neon, open the Tap Rater project and identify the intended restore time or snapshot.
2. Create a new recovery branch from that point. Do not restore over production during diagnosis.
3. connect a local or isolated Tap Rater environment to the recovery branch.
4. Run schema checks, read-only order reconciliation, and targeted page/API smoke tests.
5. If the recovered data is correct, choose either a controlled data repair or an owner-approved production restore.
6. Record the restore point, reason, validation evidence, and final production action.

Phase 4 tested point-in-time recovery, not a native snapshot: requested `2026-09-05T19:50:00Z`, resolved WAL timestamp `2026-09-05T19:48:39Z`, LSN `0/1F39A840`. Recovery branch `br-lucky-dream-atl7pz5h` has no schema differences and matching full-row fingerprints for orders, products, invoices/items, customers, and subscriptions. It is retained for owner acceptance at 0.25 CU with five-minute autosuspend. No active-database writes or connection changes were made.

For another isolated restore, use Neon Backup & Restore or authenticated CLI with explicit `branch.parent_id` and `branch.parent_timestamp`. Never select the active branch by name alone. Reconcile Stripe charges/refunds and email side effects before any database cutover; restoring a database does not reverse external actions.

Production restore requires the owner, a maintenance window, and a current recovery checkpoint. Do not change Stripe mode during database recovery.

## Cloudflare rollback

Inspect the active deployment and available versions:

```powershell
npx wrangler deployments status -c wrangler.cloudflare-git.jsonc
npx wrangler versions list -c wrangler.cloudflare-git.jsonc
```

Rollback requires the owner to observe the action and approve the exact known-good version:

Current Phase 4 known-good release: `d33d12e1-bf61-4927-a338-9012a39771df`. Pre-Phase-4 releases lack the new token isolation/media scheduler and are not security-equivalent fallbacks. The owner-observed rollback/roll-forward remains Phase 5. Inspect bindings, secrets, schedules, and database compatibility before using any older release; Worker rollback does not restore the database or media.

```powershell
npx wrangler rollback <known-good-version-id> -c wrangler.cloudflare-git.jsonc --message "Incident rollback"
```

After rollback, verify the homepage, product page, cart, account and admin login boundaries, security headers, and a Stripe test-mode checkout. Roll forward by deploying the fixed Git revision and repeating the same checks.

## R2 recovery

R2 durability protects against underlying storage loss; it does not provide application-level recovery from an accidental overwrite or deletion.

- Static storefront source images are versioned in Git and generated variants can be rebuilt with `npm run images:generate`.
- Hosted-page snapshots can be republished from the validated database state.
- Customer-uploaded media uses private daily copies in `tap-rater-recovery-backups/runs/<run-id>/objects/<original-key>`, with 30-day expiry. A cron checks every 15 minutes and copies up to 50 objects per batch, resuming unfinished work. A conditional R2 lease prevents simultaneous manual/cron progress. Failed batches retain their cursor, and retries preserve already copied files.
- Daily scans are per-object copies, not atomic whole-bucket snapshots. Target media RPO is 24 hours plus scan time while jobs stay healthy. Deletion before an object's first successful copy cannot be recovered from this backup. More than 4,800 objects requires higher throughput to meet a daily target.
- Monitor authenticated `GET /api/admin/recovery`: investigate any `media.error`, or no `media.lastCompletedAt` for 26 hours. Scheduled failures appear in Worker logs. No automatic alert delivery is claimed.
- Admin `POST /api/admin/recovery` with `{"action":"backup"}` processes one batch. Only `completedAt` proves the full scan finished. Do not erase an active lease.
- `{"action":"drill"}` copies its own disposable PNG, removes only that original, restores into a new key, verifies SHA-256 and metadata, and removes its own staging objects. Its private backup expires after 30 days.
- `{"action":"restore","backupKey":"runs/<run-id>/objects/<original-key>"}` restores only into a new `_recovery-restores/<uuid>` key, verifies size/checksum, and never overwrites the original. Privately inspect the file before owner approval for a targeted repair. Clean up staged incident restores after acceptance.
- These backups are in the same Cloudflare account. They cover ordinary object overwrite/deletion, not total account compromise or loss of account access. Maintain owner recovery access and review off-account export requirements before scaling.
- Never bulk-delete or overwrite objects during incident diagnosis.

## Verification Checklist

1. Run `npm run check:recovery-readiness`.
2. Run `npm run images:check`, `npm test`, `npm run build`, and both Worker dry runs.
3. Confirm the canonical host redirects HTTP and `www` to `https://taprater.com`.
4. Confirm private pages and APIs return `X-Robots-Tag: noindex, nofollow, noarchive`.
5. Confirm Stripe remains in test mode unless the owner is conducting the live launch.
6. Reconcile a read-only sample of products, orders, invoices, subscriptions, and hosted pages.
7. Record the deployed Worker version and the Git commit.

Phase 4 passed 770 regression tests, nine separately run isolated database tests, TypeScript, the Next/OpenNext build, a Cloudflare dry run, and deployed authentication/storage/smoke checks. The configuration gate now has 40 checks. Run `node artifacts/ecommerce-phase-4/verify-deployed.mjs --backup --drill` with the authorized local admin environment to repeat runtime checks without printing credentials or making payments.

## Encryption Key Custody

`COMMERCE_RECOVERY_SECRET` is needed to decrypt pending email bodies and activation credentials after database recovery. Do not rotate it without a versioned decrypt/re-encrypt migration. The ignored `.wrangler/commerce-recovery-key.dpapi` was decrypted locally and its 64-hex-character format verified without exposing the value.

This copy is Windows-user-bound, not portable disaster recovery. **Phase 4 remains open for the owner's vault choice, secure off-computer storage, and independent retrieval verification.** Never place the key in chat, Git, evidence files, public pages, or the media backup bucket.

## Owner-observed drill

Complete this before live launch while the owner is at the computer:

1. Review/repeat the active branch's point-in-time recovery into a temporary branch and prove the read-only validation checklist.
2. Roll the Cloudflare application Worker back to a known-good version, run smoke checks, then roll forward to the release version.
3. Rebuild one static image variant and republish one disposable hosted-page snapshot.
4. Observe the disposable media recovery drill and complete independent encryption-key custody/retrieval.
5. Record timings, gaps, and the final recovery point objective and recovery time objective.

Sources: [Neon root-branch snapshot requirement](https://neon.com/docs/ai/ai-database-versioning), [Neon history retention](https://neon.com/docs/manage/projects), [R2 Worker API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [R2 lifecycle retention](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).
