# Tap Rater Recovery Runbook

Last verified: September 5, 2026 (America/New_York)

Use this runbook for service recovery only. Never paste credentials, connection strings, customer data, card data, or webhook secrets into tickets or command output.

## Current Safeguards

- The Neon production branch is protected.
- Neon point-in-time history retention is seven days.
- Neon takes a daily snapshot at 07:00 UTC and retains it for seven days.
- Snapshot `pre-security-hardening-2026-09-05` protects the state immediately before this phase through October 5, 2026.
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

Production restore requires the owner, a maintenance window, and a current snapshot. Do not change live Stripe mode during a database recovery.

## Cloudflare rollback

Inspect the active deployment and available versions:

```powershell
npx wrangler deployments status -c wrangler.cloudflare-git.jsonc
npx wrangler versions list -c wrangler.cloudflare-git.jsonc
```

Rollback requires the owner to observe the action and approve the exact known-good version:

```powershell
npx wrangler rollback <known-good-version-id> -c wrangler.cloudflare-git.jsonc --message "Incident rollback"
```

After rollback, verify the homepage, product page, cart, account and admin login boundaries, security headers, and a Stripe test-mode checkout. Roll forward by deploying the fixed Git revision and repeating the same checks.

## R2 recovery

R2 durability protects against underlying storage loss; it does not provide application-level recovery from an accidental overwrite or deletion.

- Static storefront source images are versioned in Git and generated variants can be rebuilt with `npm run images:generate`.
- Hosted-page snapshots can be republished from the validated database state.
- Customer-uploaded product media is not fully recoverable from Git. Before live launch, choose and test a separate backup/export policy for the product-media bucket.
- Never bulk-delete or overwrite objects during incident diagnosis.

## Verification Checklist

1. Run `npm run check:recovery-readiness`.
2. Run `npm run images:check`, `npm test`, `npm run build`, and both Worker dry runs.
3. Confirm the canonical host redirects HTTP and `www` to `https://taprater.com`.
4. Confirm private pages and APIs return `X-Robots-Tag: noindex, nofollow, noarchive`.
5. Confirm Stripe remains in test mode unless the owner is conducting the live launch.
6. Reconcile a read-only sample of products, orders, invoices, subscriptions, and hosted pages.
7. Record the deployed Worker version and the Git commit.

## Owner-observed drill

Complete this before live launch while the owner is at the computer:

1. Restore the latest Neon snapshot to a temporary branch and prove the read-only validation checklist.
2. Roll the Cloudflare application Worker back to a known-good version, run smoke checks, then roll forward to the release version.
3. Rebuild one static image variant and republish one disposable hosted-page snapshot.
4. Test the chosen customer-uploaded media backup and restore process with a disposable object.
5. Record timings, gaps, and the final recovery point objective and recovery time objective.
