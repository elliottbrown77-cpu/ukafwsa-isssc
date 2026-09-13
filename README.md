# UKAF WSA / ISSSC Event Platform v0.2

Static progressive web application for ISSSC 2027, designed for Netlify with Supabase as the secure backend.

## Architecture
- Netlify: public/staff web app hosting and future custom domain
- Supabase: authentication, PostgreSQL database, RLS, audit and Edge Functions
- Jotform: retired from the target architecture

## Current workflows
- Invitation-only native attendance form
- Attendee event app: updates, programme, locations, biographies, table plans, documents and sponsors
- Sponsor Manager: permanent sponsor organisations, annual participation and named invitations
- Protocol: review requests, accept attendees, confirm stays/travel/lift passes and mark data checked
- Finance: invoice readiness, 2027 rate card and secure draft invoice build
- Content Manager: announcements, programme items and venues
- Role-based access with Supabase Auth + RLS
- PWA manifest and offline shell

## Hosting
The Netlify project is `ukafwsa-isssc` (site ID `e7588b1b-a3fd-4fda-9839-fa2859080e30`).

This build is static and requires no build command. Publish the repository root.

## Security notes
- Supabase publishable key is intentionally safe for browser use; RLS is the security boundary.
- Service-role credentials are only used inside Supabase Edge Functions.
- Issued/closed invoice financial fields and invoice lines are database-locked.
- Retired Jotform tables remain RLS-locked with no client policies.
