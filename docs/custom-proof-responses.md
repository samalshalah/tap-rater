# Custom proof responses and licence visibility

Custom proof popup supports approval, correction notes, and expandable history. Previous uploaded proof images are retrieved through the same customer-owned order endpoint; history responses never expose storage keys. Existing current attachments and customer approvals are included as available legacy history. Earlier overwritten revisions that were never recorded cannot be reconstructed.

Responses use the current proof content version plus guarded order updates. Pending corrections block customer approval until a new proof is uploaded. Replacement uploads preserve history and reset approval. Admin order details show pending notes and the history. No notifications or automatic production/publication are triggered by this change.

Google Reviews access continues to use the active customer entitlement (paid or admin-granted); expired/inactive access stays excluded. The account navigation now refreshes when the customer returns to the tab, so grants are picked up without signing out. Stand and service tools coexist for combined customers.

Validation: 88 focused tests passed, TypeScript passed. The actual popup component was exercised in a local, fully mocked browser fixture: correction submission, approval confirmation, history expansion, historical image preview, and returning to the current proof. No real order was approved or corrected during testing; no payment or publication was invoked.
