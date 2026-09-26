# ISSSC version 35

Implemented on `codex/v35-reports-approvals-replay` and released to the hosted database on 26 September 2026 after local Supabase Auth, PostgreSQL, PostgREST and Edge Function tests. The hosted staging procedure below was not performed. The private 2026 replay data remains local and was not imported into the hosted project.

## Changes

- Six spreadsheet-style reports: master attendees, hotels, lift passes, equipment, lessons and transport. Search, category/status/date filters, sorting, column selection and attendee links.
- CSV and genuine Excel exports. Master workbook includes eight sheets, including services and finance. Transport Excel includes arrivals, departures, transfer runs and unassigned travellers. Excel freezes headings and enables filters. Formula-like text is escaped.
- Server-enforced event/user permissions. Admin has all reports; Protocol and Operations have transport by default. Admin can grant view and export separately to other active staff. A master export grant includes the complete workbook and its financial details.
- Immutable export audit records actor, event, report, format, filters, fetched columns, row count, row IDs and time. Audit succeeds before rows are returned. Sorting/grouping fields may be fetched even when not displayed. An audit records preparation, not proof that a browser saved the file.
- Confirmed lift passes require a justified request. The saved pass remains unchanged until Admin approval. The transaction checks the original snapshot, applies once, preserves before/after evidence, rebuilds open invoices and flags locked invoices for a Finance adjustment. Rejection requires a note. Direct and legacy edits are blocked at the database boundary.
- Admin-only 2026 test context with a prominent banner, event-specific dates/rates, TEST-2026 references, disabled outbound delivery, restrictive RLS, protected existing RPCs, guarded PDF endpoints and restrictions on linking test records to live records.
- Netlify publishes an explicit `dist/` asset build. Source files, database fixtures and private replay data are excluded.

## Company and split billing

Finance → Attendee billing readiness → **Individual / company bill** opens the payer allocation editor. Finance and Admin can create or select a company account, including companies that are not sponsors; choose a separate company invoice for one attendee or a combined invoice for selected attendees; and assign whole charges, fixed gross amounts or percentages to the company. The individual pays the remainder. Preview totals include VAT. Saved plans and their before/after audit are server-authored; historical company responsibility is never inferred from display names.

Save the allocation, then create the allocated drafts. All selected attendees must pass billing readiness checks. Combined bills contain only saved plans for the same company and combined format. Penny rounding preserves the original net, VAT and gross totals across the two payers. Repeated or concurrent generation reuses drafts. Saved changes cancel superseded unconfirmed drafts, preserving their records; confirmed invoices cannot be reassigned. Existing draft adjustments or legacy combined drafts must be resolved before changing the payer plan. Changed source charges require Finance to review the split again before confirmation.

The local browser check created a company account and generated a £60 individual draft plus a £60 separate company draft from a £120 charge. Database tests also cover whole-company and whole-individual billing, mixed amount/percentage shares, combined billing, stale snapshots, company-recipient snapshots, immutable audit access, and blocked legacy full-charge billing. Real Auth tests verify simultaneous company-draft requests and replay access restrictions. The original 129-person replay totals still reconcile unchanged.

## Bulk worksheets and invoice dispatch

The **Bulk worksheets** staff tab provides registration, hotel, lift-pass, transport, service, charge, billing and invoice sheets. Staff can choose columns, filter, sort, paste a range into editable cells, save changed rows and export audited CSV or Excel files. Server-side field allowlists, role checks, event isolation, row versions and an Admin-readable change audit protect edits. Confirmed lift-pass changes still enter the justification and approval workflow.

Finance can mark selected attendees checked, apply individual or company payer plans, generate invoices, edit payment links and confirm selected invoices. Each batch result identifies the affected row and any error. Confirmed invoices can be reviewed with their recipient, total and payment link before dispatch. Dispatch jobs are claimed once; an uncertain email-provider outcome is held for manual review rather than automatically resent. The test-event capture path records the rendered message and PDF hash without sending email.

The synthetic 20-person workflow passed in PGlite and against local Supabase Auth, PostgREST and Edge Functions on 22 September 2026. It generated 20 distinct payment links and invoices, then captured 20 duplicate-safe dispatch jobs with no external delivery. A separate 20-attendee combined-company invoice rendered as a seven-page A4 PDF; all 60 charge lines and the £7,920 total were checked. Live provider delivery and hosted staging acceptance have not been exercised.

## Feedback corrections, 26 September 2026

The registration worksheet now lets staff edit submitted form-answer columns, including extra questions, while preserving optimistic row versions and before/after audit. Corrections update the linked booking request and intake record; the individual view and audited export show the corrected answer. Identity fields continue to use the attendee columns.

Finance can amend a confirmed accommodation billing date or rate directly in the Charges worksheet. The existing rate and package validation recalculates the underlying charge. A confirmed lift-pass rate or date edit from that worksheet creates a justified request for Admin approval. In Transfer billing review, Finance can mark a confirmed requested trip chargeable, record the billing treatment, then select an airport-transfer package. Open invoices are marked for billing review when the source changes.

The combined company PDF now names the company immediately below its invoice heading, then groups charge lines by attendee with an attendee subtotal and a company grand total. The 20-attendee sample still renders as seven A4 pages with all 60 charge lines and its £7,920 total.

## Verification performed

- 45 automated checks passed using Node and PGlite against a structural snapshot of v34 plus all nine new migrations. Covers permissions, immutable auditing, lift requests/approval/rejection, draft recalculation, locked invoice preservation, replay restrictions, submitted-answer corrections, direct financial amendments, bulk billing, CSV escaping and XLSX read-back.
- Historic replay: 139 billing rows mapped to 129 people. Application billing RPCs reproduce £196,945.00, with zero differences in attendee totals or the six checked charge components.
- Final invoicing workbook: £196,058.32. Four payer/name groups reconcile. Two observed reductions account for £886.68. These are recorded in the private reconciliation output and are not automatically treated as authorised invoice adjustments.
- Browser fixture: initial Admin report, Unicode names, filtering, CSV/Excel success, column picker, blocked export on simulated audit failure, no console errors and 390px mobile containment. This is a synthetic UI fixture, not a live authenticated end-to-end Supabase session.
- On 26 September, all nine migrations were exercised against local Supabase Auth/PostgREST/Edge Functions. Fifteen integration checks passed, including all six user roles and anonymous access, revoked grants, immutable auditing, real billing replay for all 129 people, lift approval and invoice preservation, protected PDF endpoints, disabled test delivery, invalid/anonymous token rejection, 20-person captured bulk dispatch, and authenticated registration and transfer-charge corrections. The earlier browser fixture and full authenticated browser check predate the ninth migration.
- Full authenticated app browser check passed: six-digit code sign-in through local captured email, 2026 event selection and banner, 129 attendees, filtering to two rows, CSV/Excel and eight-sheet workbook audit references, and the approvals page. No console errors were observed.
- Real Auth testing exposed a pre-existing sign-up trigger bug: an unmatched allowlist lookup cleared the default role and active flag. The sixth migration restores attendee defaults while preserving staff allowlists. A regression test covers ordinary, disabled-staff and Admin accounts, including untrusted role metadata.
- Public asset build and JavaScript syntax checks pass.
- Hosted database smoke check after the nine migrations: the active event returned 4 registration rows, 7 charge rows, 4 billing rows and 2 invoice rows from the new workspace API. The invoice-delivery and transfer-manifest Edge Functions were updated with JWT verification enabled. The push-notification function was not updated because automatic approval review rejected that unrelated production deployment.

## Historic import boundaries

The importer reads the cached values in `20250515 - ISSSC 26 Database[39].xlsm` and `ISSSC 26 - Invoicing for Lea.xlsx`, without executing macros or overwriting either file. Source hashes, mappings and warnings are retained. Generated SQL/JSON stay in ignored `.local/replay/` and the private replay package, not Git or web assets.

Contacts are sanitised: email uses `example.invalid`, mobile numbers are omitted. Names and historic operational/financial details remain personal data. Derived room/transfer tabs have stale years, so the canonical Database sheet supplies travel and accommodation. The existing travel schema supports one arrival and departure per attendee: earliest arrival/latest departure are imported, and additional legs are preserved in the manifest. Equipment, physical room inventory and vehicle assignments are not invented where the source does not establish them. The replay verifies individual billing calculations; it does not automatically recreate the final workbook's payer consolidations or reductions.

## Reproduce locally

Use Node 22+ and pnpm, plus Python with openpyxl for the private importer:

```sh
pnpm install --frozen-lockfile
pnpm test
python scripts/import-2026.py /path/to/database.xlsm /path/to/invoicing.xlsx --out .local/replay
python scripts/reconcile-historic.py /path/to/database.xlsm /path/to/invoicing.xlsx
pnpm test:replay
pnpm build
node tests/browser.mjs
```

`tests/v34-schema.sql` is a test-only structural fixture with simplified Auth and grants. It must never be applied to production. PGlite tests are supplemented by the real local Supabase integration checks described in [LOCAL-TESTING.md](LOCAL-TESTING.md). The automated Playwright runner is supplied; local browser-process restrictions required using the in-app browser for this run.

## Hosted staging procedure — not executed for this release

1. Use an isolated Supabase staging project with the current v34 schema. Review the nine migrations in filename order. Existing RPC definitions are amended dynamically; compare staging against the captured baseline before applying.
2. Apply v35 migrations to staging. Deploy `invoice-delivery` and `transfer-manifest` to staging before importing replay data. Use staging credentials/environment variables; keep email/push providers disabled.
3. Build the static app with its Supabase URL/publishable key pointing to staging. Do not connect a branch preview to the production database for testing. Run the role checks below with actual staging identities.
4. Import the generated seed as a database operator with the session JWT subject set to an existing active staging Admin. The seed requires Admin, runs in a transaction and refuses to overwrite an existing replay event. Do not alter its inactive/test/delivery-disabled settings. Select the test event from Admin's event selector.
5. Verify each report and exported workbook against the importer manifest. Reconcile final payer consolidations and the two reductions with Finance before any financial acceptance.
6. Rerun Supabase security/performance advisors and the existing production-readiness checklist. Record any staging differences before making further production changes.

### Required authenticated staging checks

- Admin, Protocol, Operations, Finance, read-only, attendee and anonymous sessions: verify allowed reports, denied RPCs and direct table reads. Revoke a grant and disable a user while a report is open; exports must fail.
- Grant master export deliberately and confirm that its financial sheets are appropriate for the recipient. Export each of the six reports with filters and hidden sort/group fields. Compare row counts and audits; simulate an audit insert failure and confirm no download.
- Confirm a lift pass, request a change, reject it and submit another. Approve once; compare pass, draft invoice and locked invoice values. Attempt legacy/direct edits and concurrent duplicate approvals.
- Verify test data is inaccessible to non-Admin users through tables, views, RPCs and both PDF endpoints. Test events must not become active or send email/push/invitations. Switch events and sign out while requests are in flight.
- Confirm existing v34 workflows still work with actual production-equivalent grants, especially views changed to `security_invoker`.
- Exercise a synthetic batch in the worksheet: paste edits, save, check readiness, create individual and combined company drafts, confirm, review recipients and payment links, then capture dispatch in a test event. Verify retries do not duplicate jobs and that a non-Admin cannot access the isolated test batch. Use a provider sandbox for any external-delivery staging check.
- Correct a submitted answer and an extra question from the registration worksheet, then verify the attendee view and Excel export. In Charges, correct a confirmed accommodation rate, request a lift-pass change as Finance and approve it as Admin. Mark a confirmed requested airport trip chargeable in Transfer billing review, record the treatment, and add the transfer package. Check invoice readiness and stale-draft handling after each change.

### Existing advisor baseline

Read-only inspection of production found existing notices for RLS tables with no policies, callable SECURITY DEFINER APIs and disabled leaked-password protection. These are not a v35 staging result. Review the [RLS notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anonymous API notice](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated API notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) during staging acceptance.
