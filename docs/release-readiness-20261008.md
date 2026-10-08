# Release readiness — October 8, 2026

## Payment verification

The owner accepted the checkout presentation fixes and authorized live activation if the new test order passed. This supersedes the earlier activation hold for configuration work, but does not authorize real charges, refunds, subscription changes, or commerce-data deletion.

The October 8, 20:25 UTC Standard Direct Google Review Stand test purchase passed independent Stripe Dashboard and application database checks:

- Stripe payment succeeded; application order and invoice are paid.
- $39.00 product + $12.00 shipping + $2.34 tax = $53.34 USD.
- Invoice `K3LIEP8J-0001` has a PDF and receipt URL.
- Checkout and invoice recovery jobs completed on their first attempts without errors.
- Application customer and admin order emails were delivered at 20:26 UTC. This does not assert that Stripe sent a separate automatic receipt email.
- No hosted subscription was created. Fulfillment remains not started / not shipped.

The active live webhook destination is configured for all 12 required events at `https://taprater.com/api/webhooks/stripe`. After Stripe identity verification cleared, the owner explicitly approved creation and configuration of a new live key. The key named `Tap Rater production Cloudflare 2026-10-08`, both live publishable-key aliases, and the existing live endpoint signing secret were saved in Cloudflare encrypted secrets. Secret replacements were staged without traffic, then activated together with `STRIPE_MODE=live`. The deployed admin configuration independently reports LIVE, matching live key modes, webhook configured, and zero blocked checks.

Both Wrangler configuration files retain `STRIPE_MODE=live` for later Git deployments. The currently deployed database (`br-restless-shape-at38e1nu`, milestone7-qa), session signers, and media bindings were preserved. Do not switch databases based on their names. Never put credentials in this document or Git.

Live signed-event delivery, real payment, and payout settlement are not established by this test order. Historical owner confirmation of the intended payout account remains outstanding in the launch records.

## Workspace cleanup

Scope confirmed by the owner: code/workspace and QA archives only. No orders, subscriptions, customers, invoices, payment records, or cloud media were removed or changed.

Archived 24 local directories containing 125,781 files (6.95 GiB) to `C:\Sites\tap-rater-archives\2026-10-08`. The archive contains old release/source/dependency snapshots, a Next cache backup, and temporary QA runs. All source paths were checked to be within this workspace, destinations within the archive, and candidates free of Git-tracked files before moving. Current source, installed dependencies, current build directories, tracked evidence, and report/screenshot directories remain in place.

The local `manifest.json` records each original path, archive path, file count, and byte count. To restore a directory, stop any process using the target, verify both paths against the manifest, ensure the original path does not already exist, and use PowerShell `Move-Item -LiteralPath <Destination> -Destination <Source>`. Do not overwrite newer files. The archive is retained locally; moving it did not free disk space.

Vitest and TypeScript now exclude archived evidence, temporary QA runs, and generated output so old application snapshots cannot enter normal checks. Git ignores new QA artifacts, archives, logs, and environment variants while allowing example environment templates. Previously tracked evidence remains tracked.

Validation: `npm test` passed 1,316 tests across 158 files; 9 opt-in integration tests in 3 files were skipped. `npx tsc --noEmit` passed. These checks do not prove a real payment or payout.
