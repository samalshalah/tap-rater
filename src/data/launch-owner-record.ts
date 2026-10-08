// Owner statements recorded in docs/ecommerce-phase-6.md and docs/release-readiness-20261008.md.
// Configuration authorization does not certify real payments or payout settlement.
export const launchOwnerRecord = {
  recordedOn: "2026-09-08",
  displayDate: "September 8, 2026",
  confirmations: [
    {
      id: "email-resolution",
      label: "Email resolution",
      detail: "The owner reported the email issue resolved. This is not a new delivery or inbox test."
    },
    {
      id: "accountant-review",
      label: "Accountant review",
      detail: "The owner reported accountant approval of manual 6% tax on Virginia physical stand subtotals only, excluding shipping and recurring service. This records that configuration's review, not independent legal approval or approval of later changes."
    }
  ],
  activation: {
    recordedOn: "2026-10-08",
    displayDate: "October 8, 2026",
    label: "Owner authorized",
    detail: "After the successful test order, the owner explicitly authorized live Stripe activation and secure configuration of the live credentials. Real payment, signed live webhook delivery and payout settlement remain separate verification steps."
  }
} as const;
