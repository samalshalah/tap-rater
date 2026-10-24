# Client licence management

Admin > Customers & Licences has a Manage licences action on each client row. The customer-scoped popup manages Google Reviews access, expiry, finite/unlimited locations, AI/scan allowances, and existing location activation. The popup has separate Google Reviews and Multi-Link tabs. Both panels stay mounted, so switching tabs preserves unsaved inputs. Tabs support arrow keys and Home/End; each service has its own save action.

The existing admin-authenticated endpoint now supports a selected customer filter and persists unlimited_locations. Grant writes retain optimistic version checks, tenant checks on enabled location IDs, and marketing_access_audit. Active grants reject a past expiry. No Stripe calls, billing changes, content publication, Google imports or scans are triggered by this UI.

Validation: 51 targeted tests passed, TypeScript passed. Local mocked browser testing confirmed the Google Reviews grant form, unlimited toggle, successful save and retained values. No real client grants were changed during testing.

Grant Google Reviews licence sends an explicit grant action that forces active status server-side. Save changes preserves an active licence; Disable service is separate and asks for confirmation. New clients enter enrolment; completed clients retain their setup. Zero-capacity finite grants and expired grants are rejected. Setup supports closing and resuming, with equal-size Google and manual connection tabs.
