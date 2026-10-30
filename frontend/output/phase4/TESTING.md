# Phase IV testing and acceptance record

Run automated checks: npm run verify:phase4

The latest generated evidence is in evidence/verification.json. Automated service tests use mocks. Fill the Actual result and Evidence columns during the live run; a blank result is pending.

| ID | Type | Steps | Expected result | Actual result / Evidence |
| --- | --- | --- | --- | --- |
| F01 | Authentication | Sign in with an existing user account. Reload. Sign out. | Session restores; sign-out removes protected access. | Pending |
| F02 | Persistence | Add activity: Phase IV commute, Transport, 10 km, 2 kg CO2e. Reload. | Record remains and totals include 2 kg. | Pending |
| F03 | Update | Edit that activity to 3 kg. Reload. | Updated value persists; total changes by 1 kg. | Pending |
| F04 | Delete | Delete only the disposable activity created in F02; confirm and reload. | Record remains absent and total is restored. | Pending |
| F05 | CSV rejection | Select public/data/phase4-invalid.csv. | Validation errors prevent submission. | Pending |
| F06 | Private upload | Upload public/data/phase4-valid.csv as Country data with a source. | Three synthetic observations validate; pending submission survives reload. | Pending |
| F07 | Admin review | Sign in as an existing admin; review F06. | Approval persists; a rejected submission requires a reason. | Pending |
| F08 | Storage | Download the submitted CSV through its signed link. Open it. | Authorized download matches the uploaded file. | Pending |
| F09 | Authorization | Sign in as a second normal user. Query activities and datasets through the normal app. Attempt a direct API read/update using the first user's disposable record ID. | First user's private rows are absent; unauthorized writes fail or affect zero rows. UI route protection alone is insufficient evidence. | Pending |
| F10 | Alerts | Confirm a disclosed metric, create a matching-unit threshold, trigger evaluation, reload as signed-in user. | Rule/event persists, citations match, duplicate event does not appear. | Pending |
| F11 | Historical UI | Open Global Explorer, choose India and change year. Open Time Machine and play/pause. | Charts and labels reflect selected observations. | Pending |
| F12 | Document review | Import a permitted BRSR PDF, confirm a metric and page, export report. | Confirmed metric retains its source/page/reporting period. | Pending |
| N01 | Recovery | Disconnect network temporarily and reload historical exploration; restore network. | Bounded wait, labelled fallback/error, no claim of live data. | Pending |
| N02 | Accessibility | Use Tab/Shift+Tab/Enter, skip link and compact navigation. | Controls have visible focus and readable names; main content is reachable. | Pending |
| N03 | Responsive UI | Review at 390px, 768px and laptop width. | Readable controls and charts; compact navigation works without page overflow. | Pending |
| N04 | Performance | Run automated 150,000-row CSV case and record the test duration. | Valid observations returned without stack overflow. | See test-results.json |
| N05 | Connectivity | Sign in, visit /data/system, run checks and download JSON. | Authenticated identity and five table reads pass, with durations. | Pending |

## Evidence to retain
Capture the saved record before/after reload, edited value, removed disposable record, pending upload, admin decision and second-account isolation outcome. Save Connection Checks JSON beside the automated logs. Record the account roles used, browser version, timestamp, observed durations and any failures. Keep passwords and API keys out of screenshots and reports.

## Database setup
Apply only unapplied migrations, in order:
1. supabase/migrations/20261008000000_initial_schema.sql
2. supabase/migrations/20261028000000_alert_rules.sql
3. supabase/migrations/20261029000000_activity_delete.sql

Use an existing administrator account or assign the intended account's admin role in the Supabase SQL Editor as the project owner. Never expose a service-role key in the frontend. Account roles are controlled by the database.
