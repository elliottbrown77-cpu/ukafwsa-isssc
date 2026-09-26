# Local ISSSC test environment

This environment runs Supabase Auth, PostgREST, PostgreSQL and Edge Functions on this Mac. It does not use a paid Supabase branch. Rancher Desktop provides the Docker-compatible engine; Apple Command Line Developer Tools are not required.

The test environment lives under ignored `.local/stack/`. The baseline uses the v34 structural fixture with its simplified Auth removed, restores captured database grants and private allowlist structures, then applies v35. No production attendee records or Auth identities are copied. Historic replay names and billing details remain private in `.local/replay/`.

## Start

1. Open Rancher Desktop. Use `dockerd (moby)` with Kubernetes disabled.
2. Set Docker connectivity for the commands below:

```sh
export DOCKER_HOST="unix://$HOME/.rd/docker.sock"
export PATH="/Applications/Rancher Desktop.app/Contents/Resources/resources/darwin/bin:$PATH"
python scripts/prepare-local-stack.py
```

On the first run, create a network whose published ports default to loopback:

```sh
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 isssc-v35-local
```

Start local Supabase (the GitHub mirror can avoid slow ECR downloads):

```sh
SUPABASE_INTERNAL_IMAGE_REGISTRY=ghcr.io pnpm exec supabase start --workdir .local/stack --network-id isssc-v35-local --exclude logflare,vector,supavisor,imgproxy
```

In a separate terminal, serve the local Edge Functions:

```sh
pnpm exec supabase functions serve --workdir .local/stack --network-id isssc-v35-local
```

Then run the checks and app server:

```sh
node scripts/local-auth-tests.mjs
node scripts/serve-local.mjs
```

The Auth tests create only local `example.invalid` accounts, import the private replay seed if absent, and check actual JWT-authenticated requests. They build the app with local API credentials. The public server refuses production configuration and permits backend connections only to local Supabase. Test passwords are randomly generated and never printed or committed.

App: http://127.0.0.1:53535

Local captured email: http://127.0.0.1:54324

For manual Admin testing, request a sign-in code for `local-admin@example.invalid` from the local app, read the six-digit code in captured email and enter it in the app. Choose the 2026 test event. No email is delivered externally. Other local accounts use `local-protocol`, `local-operations`, `local-finance`, `local-read_only` and `local-attendee`, all at `example.invalid`.

`node scripts/local-auth-tests.mjs` reruns the real-auth checks. It rotates disposable local test passwords and creates fresh synthetic approval records. Results are saved to `.local/auth-test-results.json`. It must not be pointed at a hosted project and refuses a non-loopback API URL.

The local function gateway uses `verify_jwt = false` to support the local Auth signing configuration. Each handler still validates the bearer token through `auth.getUser()` and checks the user’s role and event access. All three handlers were tested to reject anonymous and invalid tokens. This setting is confined to the ignored local stack configuration.

Validation on 26 September 2026: 45 automated tests and 15 real-auth integration checks passed with all nine migrations applied to local Supabase. The authenticated checks include 20 synthetic invoices with captured dispatch, corrected booking and intake answers with audited export, and Finance review of an airport charge. The earlier full app browser check covered code sign-in, the test-event selector, filtering 129 attendees to two matching rows, CSV, Excel and eight-sheet workbook audit references, and the approvals page, with no browser console errors; it predates the ninth migration.

## Try company or partial billing

In Finance, find an attendee and choose **Individual / company bill**. Add or select a company account. Choose a separate company invoice or a combined company invoice, then allocate each item to the individual, company, a company percentage or a fixed company amount. Save the allocation and create the drafts. Company account details and saved allocation choices are local test data. The historic import does not presume which companies have agreed to pay.

## Try bulk worksheets

Open **Bulk worksheets** in the staff portal. Choose a sheet, select columns and filter rows. Paste tab-separated cells into an editable starting cell, then choose **Save changed rows**. The registration sheet includes editable submitted answers and extra questions when a linked booking or intake record exists. Charges require a reason; accommodation billing dates and rates recalculate at source, while confirmed lift-pass edits create requests for Admin approval. In **Transfer billing review**, Finance can mark a confirmed requested trip chargeable, record the treatment, then select its transfer package in **Billing readiness**. Select attendees there to check, set payer plans and generate drafts. In **Invoices & dispatch**, enter individual HTTPS payment links, confirm selected invoices and review the recipient list before test capture. The isolated 2028 training event used by the Auth checks contains 20 synthetic attendees; captures produce audit records and PDFs without sending email.

## Stop

```sh
pnpm exec supabase stop --workdir .local/stack
```

Stop the app server and function-serving terminal with Ctrl+C as well. This preserves local database volumes. Quit Rancher Desktop when finished to release its reserved memory. Do not use `--no-backup` or reset the database unless you intend to discard this local test state.

This configuration is for local testing only. It is not a production deployment procedure. Do not commit or publish `.local/`, generated credentials, or the historic seed.
