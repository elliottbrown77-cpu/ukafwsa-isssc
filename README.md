# UKAF WSA / ISSSC 2027 web app

Static single-page web application for Netlify, backed by the Supabase project `ISSSC Attendance & Billing`.

## Current scope
- public ISSSC 2027 landing page
- attendee registration form writing to `intake_submissions`
- attendee event-app shell
- Supabase passwordless staff sign-in
- role-aware staff portal shell with live counts and read-only intake/sponsor/invoice views
- PWA manifest and service worker
- security headers suitable for a static Netlify deployment

## Deployment
Upload the contents of this directory to the root of the connected GitHub repository, then Netlify will deploy from `main`.

## Important before public launch
- replace the placeholder SVG mark with the approved UKAFWSA logo asset
- complete the Association-approved privacy notice
- configure Supabase Auth redirect/site URLs for the production domain
- add bot protection to public registration
- test RLS against each staff role
- move attendee sensitive fields into a tighter sensitive-details model before broad attendee portal access
