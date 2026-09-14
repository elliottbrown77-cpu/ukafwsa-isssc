# UKAF WSA / ISSSC 2027 web app

Static single-page web application for Netlify, backed by the Supabase project `ISSSC Attendance & Billing`.

## Current scope

- public attendee registration and passwordless sign-in
- role-controlled staff administration and operational overview
- Protocol attendee records, room allocation, lift passes and transfer manifests
- sponsor terms, invitations, attendees and room entitlement
- Finance readiness, confirmed rate card, locked invoice snapshots, PDFs and email audit
- event programme, Méribel venues, BFBS links, results PDFs, media and table plans
- staff announcements and attendee browser notifications
- PWA manifest, offline static assets and production security headers

## Deployment
Upload the release files to the root of the connected GitHub repository. Netlify deploys the `main` branch to `https://ukafwsa-isssc.netlify.app`.

Database migrations in `supabase/migrations` have already been applied to the linked production Supabase project. Do not paste or rerun them manually unless recovering a different environment.

## Before public launch

Use [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) as the controlled launch checklist. The remaining launch blockers are deliberately visible there and in the staff Operational overview.
