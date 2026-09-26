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
Netlify builds public assets with `node scripts/build.mjs` and publishes `dist/`. The connected production branch is `main`. See [V35-REVIEW.md](V35-REVIEW.md) for the worksheet and billing changes, verification, and outstanding staging checks.

The nine v35 migrations in `supabase/migrations` were applied to the hosted database on 26 September 2026. The structural schema fixture under `tests/` is for disposable local tests only.

## Before public launch

Use [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) as the controlled launch checklist. The remaining launch blockers are deliberately visible there and in the staff Operational overview.
