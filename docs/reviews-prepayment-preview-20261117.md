# Google Reviews business-first purchase

Requested flow: find a business → connect Google → analyse unanswered reviews → email and payment → continue with the saved business in setup.

## Scope

- Production baseline: deployed owner-approved cleanup `4c45e1c` (Worker `721f7aa8-48df-437f-a064-15bf6b412bdc`). The remote production Git branch was behind the actual deployment; its missing approved commits are retained in this release. Release worktree: `reviews-preview-release`.
- Reuses the approved Reviews card, typography, colors, and hero. Full name is no longer requested before checkout. The verified business name supplies the new customer reservation label.
- Anonymous previews use a random, HttpOnly browser capability and independent `reviews-preview:<uuid>` encrypted Google credentials. Existing Google callbacks retain their existing authentication path.
- Public Places selection must match the connected Google location's place ID. Google review pages are read without assigning a workspace or publishing anything. The preview stores review identifiers, star ratings, and reply-presence flags, not review text or reviewer names.
- Counts deduplicate review IDs, include rating-only reviews, handle missing ratings separately, and are not presented as complete until pagination ends. Discrepancies with Google's headline total are explained.
- Checkout rejects unfinished previews, stale selections from another browser tab, already-assigned locations, and authenticated customers with existing Reviews access. The server owns the selected location and Stripe metadata.
- Only a verified paid subscription with matching customer, attempt, and payment environment can claim a preview. Activated customers explicitly continue with it in onboarding. A new workspace receives a separately encrypted connection; existing connections are never overwritten or moved. Database uniqueness remains the final protection against assignment races.
- Anonymous credentials expire after one day; checkout reservations retain credentials for eight days to allow activation. Cleanup deletes only isolated preview copies, never revokes a Google grant. If an activation happens later, the business is still saved and setup offers a fresh Google connection.
- New subscriptions remain imports and drafts only. Existing customers' replies, stand checkout, and paused Growth settings are unchanged.

## Validation

- Automated regression suite and focused preview security tests passed; see the final release record below for the combined production test count.
- Dedicated QA branch `qa-reviews-launch-20261114`: actual SQL preview storage, pagination, pending account, checkout metadata, unpaid/paid webhook state, activation boundary, saved selection, credential handoff, draft-only policy, and idempotent setup passed. Google, Stripe, and email were simulated; external network was restricted to that QA database. Synthetic records were cleaned up.
- Browser fixture uses the real purchase components with synthetic Google/Stripe responses: search, selection, Google return, account/location discovery, analysis, email and checkout handoff passed. Desktop and 390-pixel phone layouts inspected.
- No fresh live payment, live OAuth consent, public reply, or main-account mutation was performed for these checks.

Deploy the additive `docs/sql/reviews-purchase-preview.sql` migration before the Worker. It was applied and exercised on the dedicated QA branch first. No existing table data is updated by the migration.
