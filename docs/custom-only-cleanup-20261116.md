# Custom-only catalog cleanup

Selected release: checkout-tracking, release/sales-readiness-20261116. Owner explicitly authorized cleanup in the local release and live catalog/storage. No billing changes, push or deployment.

Live changes: removed 60 inactive Standard Direct options and one inactive template; cleared standard artwork metadata on 60 products. No product rows were deleted: all rows support custom purchases. Updated two legacy alias image references and two homepage content records to existing custom artwork. Custom prices and purchase requirements match the pre-cleanup snapshot across all 60 active custom offers. All 28 orders remain. All 60 public product URLs still return product models.

Local changes: removed 1,068 obsolete image files (originals and generated variants), after verified ZIP backups. Replaced generic seed/category imagery and removed generic authoring defaults and media controls. API/CSV saves reject retired Standard options and cannot repopulate their image metadata. Historical option readers remain compatible.

Protected assets: Google and Yelp historical front images plus their variants (12 files), one Google image used by a saved customer draft plus variants (6), and shared no-photo fallback plus variants (6). These are not advertised as generic products. Alias records remain for existing drafts and historical URLs. No customer uploads or proofs were deleted.

Storage finding: obsolete catalog images are Worker static assets, not identified standalone R2 media objects. Their source and rebuilt bundle copies are removed locally. Their deployed copies and old code fallback references remain until an approved deployment. No R2 product-prefix deletion was performed because those prefixes may contain customer artwork.

Validation evidence is in ../artifacts/sales-readiness/2026-11-16/generic-cleanup relative to the workspace root: final-verification-summary.json, test.log, cfbuild.log, dryrun.log, public-catalog.json and final-live-verification.json. Image integrity check verifies 815 generated variants. Removed-file manifests and checksum-verified ZIP archives support restoration. Live row backups precede each narrowly scoped mutation.

Remaining release gates: deployment approval; independent physical manufacturing/NFC/fulfillment certification remains outside the software tests. Prior email gate passed: Resend and the live callback ledger confirmed delivery, and the owner confirmed Inbox receipt. No new paid purchase was created for this cleanup.
