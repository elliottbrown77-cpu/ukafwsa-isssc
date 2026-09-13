# UKAF WSA — ISSSC 2027 web platform v0.4.1

Static progressive web application for the Inter Service Snow Sports Championships 2027, backed by the dedicated Supabase ISSSC project and designed for Netlify.

## Included

- Public ISSSC landing page and live event app
- Invitation-led native attendee registration, including privacy acknowledgement
- Secure attendee **My trip** view for request status, confirmed accommodation, travel, lift pass, seating and issued invoices
- Passwordless staff authentication
- Admin user and role management with audit-log review
- Sponsor Manager workspace, named invitation generation and invitation status tracking
- Protocol intake with accept/decline review and server-validated canonical attendee operations
- Finance readiness, rate approval, individual and consolidated invoices, invoice status, adjustments, payment links and print/PDF output
- Event content management for announcements, programme, venues, biographies, documents, table plans and structured seating, including live edits/publish controls
- Public asset uploads to Supabase Storage
- PWA/offline shell
- Privacy notice
- Netlify redirects and security headers

## Architecture

- **Netlify** — public and staff web application hosting
- **Supabase Auth** — passwordless sign-in
- **Supabase PostgreSQL** — canonical event, attendance and billing data
- **Supabase RLS** — browser data-access boundary
- **Supabase Edge Functions** — privileged Protocol, Finance and booking workflows
- **Supabase Storage** — controlled public event assets
- **GitHub** — source control and continuous Netlify deployment

No service-role key is present in the browser. Privileged mutations are performed by authenticated Edge Functions and service-only database functions.

## Deployment

The application is static and requires no frontend build command. Publish the repository root. `netlify.toml` supplies the SPA fallback and security headers.

Supabase Auth must allow the production Netlify origin as a redirect URL for passwordless sign-in. The connected project-owner account is allowlisted as the initial administrator; other staff roles are assigned from the User access workspace after first sign-in.
