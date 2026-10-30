# TrustCarbon — Phase IV Project Report

**Group 39** · Jainam Bhavsar, Adil Khan, Aditya Chavan  
Prepared: 29 October 2026  
Evaluation rubric supplied: Phase IV, 25 marks

## 1. Abstract
TrustCarbon is a web application for exploring historical carbon emissions and reviewing corporate environmental disclosures. It combines country comparisons, Indian geographic insights, statistical analysis, personal carbon records and private dataset review. React provides the interface, while Supabase supplies authentication, PostgreSQL and private file storage. Historical observations, corporate disclosures and user assumptions retain separate source labels. The application helps users inspect emissions patterns and the evidence behind them.

## 2. Problem and objectives
Carbon data appears in different units, reporting periods and document formats. Comparing figures without their context can produce misleading conclusions. TrustCarbon provides a common exploration workspace with visible units and sources. Its objectives are to visualize historical emissions, explain descriptive calculations, support human review of corporate document extraction, persist personal records, and manage dataset submissions through role-based review.

The project supports students, researchers and users interested in carbon accounting. Its analysis supports investigation rather than regulatory certification. Statistical anomalies indicate observations to inspect and do not establish fraud. User-defined reduction scenarios describe assumptions rather than predictions.

## 3. Requirements and scope
Functional requirements include country/year exploration, comparisons and rankings, historical playback, anomaly screening, scenario calculations, BRSR document review, threshold alerts, account authentication, activity creation/editing/deletion, CSV submission and administrative approval or rejection.

Non-functional requirements include clear loading and error states, private account data, source traceability, responsive navigation, bounded network requests, recoverable application errors and repeatable verification. Public historical exploration works without signing in. Account-specific records require authentication. Corporate PDFs and confirmed extraction values remain in browser-session state. Saved alert rules and event evidence use the database for signed-in users.

## 4. Architecture and integration
The frontend uses React, React Router and Recharts. Route modules load lazily. React contexts coordinate authentication, historical data and corporate review state. Service modules isolate Supabase operations and external source requests. Framework-independent analysis modules calculate trends, comparisons, rankings and source assessments.

The authenticated data path is: form input, service validation, Supabase API, PostgreSQL access policy, database response, refreshed React state. A reload retrieves saved records again. Supabase Auth supplies the account identity. Role checks control route access, while database row-level security enforces ownership independently of the interface.

Dataset submission first places a CSV in a private storage folder belonging to the account, then creates a pending database record. If record creation fails, the service attempts to remove the uploaded object. Administrators review pending records and provide a reason for rejection. Downloads use short-lived signed links.

Historical exploration requests Our World in Data observations and per-capita values. The service combines observations by country and year, shares concurrent requests and caches successful results. Source failure activates a labelled bundled CSV fallback. Climate TRACE integrations supply additional estimates on demand.

## 5. Database design
| Entity | Main fields | Relationship and access |
| --- | --- | --- |
| profiles | id, email, full_name, role | References an Auth user; owner/admin reads |
| activities | id, user_id, category, amount, unit, co2_emission, activity_date | Belongs to a profile; owner CRUD |
| datasets | id, uploaded_by, file_url, status, reviewed_by, reviewed_at | Uploader submits; administrator reviews |
| alert_rules | id, user_id, company, metric, operator, threshold, unit | Private rules belonging to an account |
| alert_events | id, user_id, rule_id, company, reporting_year, observed_value | Private evidence linked to a rule |
| Storage objects | bucket, account folder, object name | Private CSV files with ownership policies |

Foreign keys connect records to profiles and rules. Constraints reject invalid statuses and negative activity amounts/emissions. Indexes support account/date lookups and pending dataset review. Alert-event uniqueness prevents duplicate observations for the same rule and reporting period. A new migration supplies activity DELETE permission and the matching ownership policy.

## 6. Implementation and Phase IV improvements
The personal dashboard now supports editing recorded activities and confirming deletion. Successful changes reload records and recompute totals. Failed operations display errors. Deletion requests return the deleted identifier, so an unavailable or inaccessible row cannot silently appear successful.

The Connection Checks screen at /data/system verifies configuration and, after sign-in, the account identity and reads from five database tables. It records response durations and exports JSON evidence. Guest checks explicitly skip authenticated verification. Successful SELECT checks establish reachability, while separate save/reload and isolation checks establish persistence and authorization behavior.

Data quality fixes preserve real zero values while excluding blank historical values. CSV validation counts only valid observations, rejects duplicate location/year entries and computes year ranges without spreading large arrays onto the call stack. External historical requests time out after 12 seconds. Supabase requests use a 15-second timeout and retain caller cancellation. An application error boundary provides a recovery action if rendering fails.

Compact navigation removes the previous forced 1,024-pixel layout on narrow viewports. Demo activity and goal figures carry an explicit label. Fixed example reduction progress appears only for the demonstration profile, so it cannot be mistaken for a result calculated from saved activities.

## 7. Analysis methodology
Country emissions normalize to tonnes, megatonnes and gigatonnes using powers of one million and one billion. Per-capita observations remain unavailable where the source lacks them. Trend comparisons preserve reporting years and distinguish previous observations from consecutive annual comparisons. Missing years prevent unsupported annual or cumulative conclusions.

The source-assessment rubric weights credibility at 25%, coverage at 20%, completeness at 20%, freshness at 15% and validation at 20%. These scores express the project's stated rubric. Corporate threshold evaluation requires confirmed evidence, compatible units and matching periods. BRSR extraction produces review candidates with page references; the user confirms the reporting column and metric before use.

## 8. Functional and non-functional testing
Vitest executes calculation, validation and service regression tests. Service tests mock backend responses to reproduce success and failure conditions consistently. Automated checks cover trends, time-machine behavior, alerts, missing source values, schema changes, caching, retry, CSV validation, failed-upload cleanup and connection-check outcomes. A large-input regression processes 150,000 CSV observations without a call-stack overflow. This measures a local validation workload rather than server concurrency or a production capacity guarantee.

The evidence directory contains machine-readable test results, test logs, strict lint output, a production-build log and a verification summary. Run npm run verify:phase4 to regenerate these results. A browser review loaded 29,384 Our World in Data observations and confirmed that the revised Connection Checks layout fits a narrow window.

Live backend probes from the command runtime failed to fetch. Authenticated create/read/update/delete, private storage, administrative review and two-account isolation have not been verified in this environment. The accompanying TESTING.md gives exact acceptance steps and expected results. These pending checks must be completed against the configured project before claiming the full live integration has passed.

## 9. Results and limitations
The automated result summary follows this section in the generated HTML report. The application builds for production, and the regression suite checks both calculations and selected failure paths. This supports confidence in local behavior but does not replace end-to-end evidence from the deployed database.

External APIs need network access and can change coverage. The fallback provides historical exploration with a visible warning. PDF text extraction needs human confirmation, and scanned documents may require OCR outside the current workflow. Corporate documents do not survive a full browser-session reset. Threshold evaluation occurs when data/rules load or change rather than through a continuously running background monitor. Personal emissions are entered estimates, and meaningful reduction progress needs a comparable baseline.

## 10. Conclusion and future work
TrustCarbon provides an integrated design for emissions exploration, evidence review and private account workflows. Phase IV improvements add complete activity controls, connection evidence, stronger data validation and clearer failure handling. Future work includes durable corporate-document storage, OCR, scheduled monitoring and broader browser automation. The immediate submission requirement is to record the live persistence, storage and isolation checks alongside the automated evidence.

## References
- Project source: src/, supabase/migrations/ and README.md.
- Our World in Data: https://ourworldindata.org/co2-and-greenhouse-gas-emissions
- Climate TRACE: https://climatetrace.org/
- Supabase architecture and service usage: src/config/supabase.js and src/services/.
- Local test evidence: output/phase4/evidence/verification.json and test-results.json.
