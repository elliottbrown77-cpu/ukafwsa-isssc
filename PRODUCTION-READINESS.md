# ISSSC 2027 production readiness

Checked on 14 September 2026 against the production Supabase project and the live Netlify site.

## Release position

Version 26 adds the staff Operational overview, privacy acknowledgement, safer service-worker caching, consistent production headers and database performance indexes. The database migrations are applied. The web files still need to be uploaded to GitHub and allowed to deploy before version 26 is live.

## Checks passed

| Area | Result | Evidence |
| --- | --- | --- |
| Supabase health | Pass | Production project is active and healthy in the London region. |
| Operational overview | Pass | Admin call returns aggregate event queues; anonymous and unapproved authenticated calls are rejected. |
| Database migrations | Pass | Both version 26 migrations passed transaction/rollback validation before application. |
| Row-level security | Pass with accepted advisories | No exposed table was reported without RLS. Six internal service-only tables intentionally have no client policies. |
| Database indexes | Pass | The two missing intake foreign-key indexes were added; no unindexed foreign keys remain. |
| Billing controls | Pass | Billing configuration is confirmed and 41 rates are approved. Confirmed invoice snapshots remain immutable. |
| Netlify availability | Pass | Home, app assets, privacy page and an unknown SPA route return successfully over HTTPS. |
| Browser security headers | Pass | HSTS, CSP, frame denial, MIME sniffing protection, restrictive permissions, no-referrer and opener isolation are configured. |
| PWA assets | Pass | Manifest, 192/512 icons, maskable icon and service worker are present. Version 26 serves the correct manifest MIME type. |
| Offline cache boundary | Pass | The service worker caches only named same-origin static assets and never intercepts Supabase or other cross-origin API reads. |
| Front-end validation | Pass | Main modules and service worker pass JavaScript syntax checks; the overview render and cache-boundary tests pass. |

Supabase's SECURITY DEFINER advisory remains because staff actions are exposed as authenticated RPCs. This is intentional: every such action performs its own active-role check and uses a fixed search path. It should be re-reviewed whenever a staff RPC is added.

## Launch blockers

| Owner | Required action | Current position |
| --- | --- | --- |
| Association / data controller | Replace `privacy.html` with the approved privacy notice, including controller contact, lawful basis, retention, rights and special-category data handling. | The current page is explicitly a development placeholder. Registration now requires acknowledgement, but the wording is not launch-ready. |
| Technical administrator | Add server-verified anti-bot protection to public registration. | A honeypot reduces simple spam but is not sufficient for public launch. A Turnstile or hCaptcha site key and secret are required. |
| Technical administrator | Establish recoverable backups before collecting real registrations. | The Supabase organisation is on the Free plan, which does not include managed daily backups. Upgrade to Pro or schedule encrypted off-site database dumps; Storage objects need a separate backup. |
| Admin / Finance | Save a verified invoice sender and connect the secure email provider. | No active sender is saved, so invoice email delivery is not production-ready. PDF preview and download remain available. |
| Protocol | Verify the imported hotel inventory. | 81 rooms are available; 33 are still marked unverified. |
| Content team | Publish attendee-facing content. | Published programme, venues, results, media, table plans and transfer runs are currently all zero. |
| Admin | Complete multi-role staff acceptance testing. | One staff account is currently active. Test staff will be added after the build is complete. |
| Supabase administrator | Enable leaked-password protection if password sign-in is ever enabled. | The current app uses passwordless magic links, but Supabase still reports the general Auth advisory. |

## Current operational data to resolve or remove

The dashboard currently reports one pending registration, one room allocation decision, two confirmed transfer requests without manifest assignments, one prospective sponsor, two unused sponsor rooms and one issued/unpaid invoice. Confirm which records are real and remove or close any test records before launch.

## Staff acceptance test

Use at least one account for each intended role. Verify that a user can see only the relevant data and cannot perform another role's write actions.

1. Register a new attendee on mobile and desktop; verify the privacy acknowledgement, confirmation message and intake record.
2. Protocol accepts the request, makes the final room choice, confirms travel and lift pass, and assigns both transfer directions to manifests.
3. Sponsor Manager creates a sponsor invitation, links an attendee and confirms the room entitlement figures.
4. Finance resolves readiness, creates a draft, confirms it, previews the PDF and verifies that changing the rate card does not alter the confirmed invoice.
5. Content Manager publishes a venue, programme item, result PDF, media item and table plan; verify the attendee Event app.
6. Notifications staff publish an alert and verify receipt on an opted-in attendee device.
7. Read Only can view operational data but cannot save changes.
8. An inactive or unapproved email cannot enter the staff console.
9. Test the installed PWA after an update and confirm the latest interface appears after reopening.
10. Export or restore a test backup before accepting real data.
