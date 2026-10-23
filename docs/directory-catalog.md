# Directory catalog and future API adapters

The reference catalog contains all 73 directories from the supplied screenshots. Catalog IDs are Tap Rater identifiers, **not provider publisher IDs**. Reference parent relationships describe the supplied reference only; they do not authorize indirect distribution or confirm present provider coverage.

Each selected location gets its own virtual checklist. Existing saved checks and custom directories remain intact. Legacy labels Apple, Bing, Better Business Bureau, and Yellow Pages resolve to the corresponding catalog entry so they do not add a duplicate starter row. No migration or bulk insertion is required.

`directory-provider-contract.ts` defines a read-only adapter interface, tenant/location/publisher mapping, observation payload and pagination. Its readiness guard rejects mismatched scope, unmapped locations and unverified coverage before invoking an adapter. No provider is installed. The UI remains manual and lists the stable catalog ID inside Details.

To connect a provider later: verify its current coverage and terms; implement server-only credential storage and authenticated ownership/package checks; persist explicit customer/location/publisher mappings using provider discovery; implement paginated reads and reconciliation; test isolated tenants and locations. The contract is groundwork, not a production integration. No credentials, provider publisher IDs or coverage were guessed.

There is no external write method. Submissions require a separate future implementation with approved profile versions, audit records, idempotency and an explicit publishing gate. Replies and profile changes remain drafts; pricing is unchanged.
