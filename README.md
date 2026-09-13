# UKAF WSA — ISSSC 2027 web platform v0.7

Static progressive web application for the Inter Service Snow Sports Championships, backed by the dedicated Supabase ISSSC project and deployed through GitHub to Netlify.

## v0.7 highlights

- Public Event App now exposes only deliberately public content.
- Signed-in attendees unlock attendee-only programme items, announcements, documents and table plans plus only their own seating assignment.
- Attendee-only files are stored in a private Supabase Storage bucket and delivered with short-lived signed URLs.
- Push announcements respect their configured audience rather than broadcasting every non-public update to every subscriber.
- Canonical attendee, travel, accommodation, lift-pass, usage and finance tables are read-only to browser clients; privileged mutations run through authenticated Edge Functions and service-only database functions.
- Finance readiness now checks staff review audit, required accommodation/lift data, rate resolution and chargeable transfer review.
- Consolidated billing supports explicit attendee inclusion/exclusion, organisation billing-address maintenance, PO requirements, PO references, configurable payment terms and authorised billing-address exceptions.
- Invoice issue rules block proposed rates and incomplete required billing data.
- Dinner-only charges that overlap confirmed DB&B are suppressed unless an explicit approved exception exists.
- Future-year lift-pass and usage defaults derive from the attendee event year instead of hard-coded 2027 rate codes.
- Booking acceptance now uses the event-configured default lift-pass type and creates durable user-to-attendee links when an authenticated account already exists.

## Existing platform features

- Invitation-led native attendee registration with privacy acknowledgement and validation
- Secure **My trip** view for attendance status, accommodation, travel, lift pass, seating, invoices and notification preferences
- Passwordless authentication and role-aware staff workspaces
- Sponsor Manager: organisations, contacts, event participation, room entitlements and personal invitation links
- Protocol: intake review, canonical attendee records, split stays, package exceptions, transfer review, lift passes, usage/extras and room inventory
- Finance: rate approval, readiness, individual/consolidated invoices, adjustments, payment links, PO control and print/PDF output
- Content: announcements, programme, venues, biographies, documents, table plans, structured seating and push notifications
- Admin: staff roles, audit log, event setup and controlled rollover to a future championship
- PWA/offline shell, privacy notice, Netlify redirects and security headers

## Architecture

- **Netlify** — static public/staff application hosting
- **Supabase Auth** — passwordless sign-in
- **Supabase PostgreSQL** — canonical event, attendance and billing data
- **Supabase RLS** — browser read boundary
- **Supabase Edge Functions** — trusted Protocol, Operations, Finance, Admin and notification actions
- **Supabase Storage** — separate public and private attendee asset buckets
- **GitHub** — source control and automatic Netlify deployment

No service-role key is present in the browser. The public registration remains a request/intake mechanism; Protocol owns the canonical operational record after acceptance. Finance works from confirmed operational data rather than free text.

All 2027 rates remain **Proposed** until explicitly approved by the event authority. Unknown VAT treatment, room capacity, sponsor entitlement, transfer charging unit and unresolved category/rate mappings are not inferred.

## Deployment

No frontend build command is required. Netlify publishes the repository root and `netlify.toml` provides the SPA fallback and security headers. Supabase Auth must allow the production Netlify origin as a redirect URL for passwordless sign-in.
