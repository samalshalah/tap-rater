# Business profile source for directory adapters

The customer editor at `/account/profile?location=<businessId>` owns the expanded business-profile draft. Directory Listings links to this editor for connected Google locations. Manual unconnected locations retain the existing basic editor.

Storage uses the existing `google_profile_drafts` JSON documents, so this addition needs no database migration. `observed` contains the imported Google snapshot; `draft` contains the client's proposed profile. Both are bound to the business ID, Google resource parent and Google subject. Refresh updates observed fields and preserves the saved draft. Optional media/attribute failures retain the prior snapshot and report that those sections were not refreshed.

Future directory adapters must read through `profileSnapshot` after customer authorization and use `mergeBusinessDraft` to prepare a reviewable distribution proposal. They must not automatically publish either observed data or saved drafts. Pin approvals to profile version and revalidate the Google assignment and business ownership before any future send. Existing manual listing-correction approvals do not authorize distribution of this expanded draft.

Supported draft fields: business name, description, category names (with imported category IDs until edited), contact details, structured and display address, coordinates, address visibility, status, service areas, regular/special/additional hours, services, attributes, payment methods, social URLs, featured message/link, logo, cover and media references. The media list includes up to 1,000 items with an explicit partial status if more pages remain. Google video URLs are preview images, not downloadable original video assets. Imported media references may expire; adapters must refresh and obtain suitable owner-authorized assets before distribution.

Provider-specific category mappings, media licensing, required-field validation, approval contracts and delivery receipts are intentionally deferred until the directory provider is selected. Pricing and external publishing remain disabled for this workflow.
