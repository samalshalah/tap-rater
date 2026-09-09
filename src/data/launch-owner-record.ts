// Owner statements recorded in docs/ecommerce-phase-6.md, not automated verification.
// Historical confirmations do not certify later settings changes or authorize checkout.
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
    label: "On hold",
    detail: "The owner requires final website and system acceptance before separately authorizing live Stripe activation. Live payment, webhook and payout proof remain separate release evidence."
  }
} as const;
