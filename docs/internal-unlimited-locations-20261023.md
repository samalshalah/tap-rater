# Internal unlimited location access

Owner requested unlimited client-management locations for sam.alshalah1@gmail.com on October 23, 2026. The existing verified account and credentials were preserved. Added an explicit unlimited_locations flag, default false, instead of pretending a large numeric allowance is unlimited. Applied the migration to staging and the verified production runtime branch br-restless-shape-at38e1nu.

Sam received active manual access with no expiry and unlimited_locations=true; its three existing business locations were claimed successfully. No paid subscription or charge was created. AI and scan allowances remain finite, ownership checks remain enforced, and the production ranking provider remains disabled. The database audit records the owner authorization. The location-count override is internal; the current admin numeric allowance field is a fallback and does not represent the effective cap for this flagged account.

Isolated integration test passes: two own locations can be claimed with numeric limit zero and the override enabled; another customer's location cannot be claimed; an ordinary account with limit zero stays blocked; AI allowance still rejects over-budget requests.

The proposed live signup test email info@horizonlight.us was also found already active and verified. No activation token, password or existing account state was reset. Awaiting an unused email address to finish the live signup email test.
