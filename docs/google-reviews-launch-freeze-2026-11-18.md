# Google Reviews launch phase — closed and scope frozen

Owner instruction: November 18, 2026 (America/New_York). Finalize this launch phase, freeze scope, and do not repeat completed tests. The owner will perform their own real-customer test using another email.

## Frozen release

- Approved Prismatic website and account styling.
- Business discovery, fresh Google connection, pre-payment review analysis, plan/profile details, Stripe checkout, activation and Reviews setup.
- New subscribers: review imports and editable/copyable reply drafts only; 1,000 drafts per location monthly. Public posting and autopilot remain disabled for this cohort.
- Paid-period location licences for new subscribers; deleting a location does not release its licence during that paid period.
- Pause/Resume service remains separate from billing.
- Subscription & Billing: Remove from plan at renewal, Cancel entire subscription at period end, and undo controls before the effective date.
- Sidebar label: Subscription & Billing; existing destination and styling retained.

## Protected boundaries

- Do not migrate or modify the owner's main account, location assignments, existing reply capabilities or settings.
- Preserve stand commerce and checkout.
- Google Growth remains paused.
- No production payments, cancellations, public replies, account changes or new promotions are authorized by this closure record.

## Accepted evidence and limits

The previous launch-validation document is historical evidence; its older hidden-package and intermediate-blocker statements describe those earlier dates, not this final release.

Fresh Google OAuth and read-only import, isolated onboarding, checkout/activation work and scoped release checks were completed during the launch phase as recorded in the project history. These are separate checks, not a claim that one uninterrupted real-money customer journey has been performed on the owner's new email.

Real Stripe sandbox billing checks verified deferred removal, next-period quantity/billing changes, cancellation, undo, duplicate/stale requests and interrupted-request recovery. The interactive browser run exercised all four customer actions and restored the QA plan to active with three locations, no pending removal/cancellation and no extra invoice. No Google connections exist on those synthetic billing-test locations.

The final label-only production release is commit `848beec` on `nextjs-commerce`, Worker `e305da18-765a-4049-9f51-e139d8e9494c`. Build and desktop/mobile navigation checks passed. The last release checks showed `/checkout` HTTP 200 and `/growth` redirecting to `/shop`. No tests or application deployment were repeated to close this phase.

## Change control after closure

No further features, redesigns, billing offers, cohort changes or repeated regression runs without a new owner request. Diagnose a specific reported defect when requested, with only the checks needed for that defect. Monitoring is not scheduled automatically. Keep automatic reply posting outside this launch scope.

The owner's real-customer test should use a separate email and a Google location not assigned to the protected main account. A normal one-location purchase exercises the released payment path. A 100% discount does not verify an actual card charge. Promotion-code entry is not currently enabled in the Reviews checkout; adding it would be a separately authorized scope change. No coupon or promotion code was created during finalization.
